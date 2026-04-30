import logging
import math
from datetime import date, datetime
from typing import Any

from database import ensure_programs_schema, get_db

from .recommend_stats import build_summary

logger = logging.getLogger(__name__)

_SELECT_PROGRAM_COLUMNS = """
    p.id,
    p.title,
    p.description,
    p.category,
    p.source,
    p.organization,
    p.start_date,
    p.end_date,
    p.url,
    p.created_at,
    p.support_target,
    p.support_scale,
    p.project_period,
    (
        SELECT GROUP_CONCAT(DISTINCT pk2.keyword ORDER BY pk2.keyword SEPARATOR ',')
        FROM program_keywords pk2
        WHERE pk2.program_id = p.id
    ) AS keywords_joined
"""

_RECEPTION_STATUS_EXPR = """
(
  CASE
    WHEN (p.start_date IS NULL OR TRIM(COALESCE(CAST(p.start_date AS CHAR), '')) = '')
     AND (p.end_date IS NULL OR TRIM(COALESCE(CAST(p.end_date AS CHAR), '')) = '')
      THEN '기간미상'
    WHEN (p.start_date IS NOT NULL AND TRIM(COALESCE(CAST(p.start_date AS CHAR), '')) <> '')
     AND (p.end_date IS NOT NULL AND TRIM(COALESCE(CAST(p.end_date AS CHAR), '')) <> '')
      THEN
        CASE
          WHEN CURDATE() < DATE(p.start_date) THEN '예정'
          WHEN CURDATE() > DATE(p.end_date) THEN '마감'
          ELSE '접수중'
        END
    WHEN (p.start_date IS NOT NULL AND TRIM(COALESCE(CAST(p.start_date AS CHAR), '')) <> '')
      THEN CASE WHEN CURDATE() < DATE(p.start_date) THEN '예정' ELSE '접수중' END
    WHEN (p.end_date IS NOT NULL AND TRIM(COALESCE(CAST(p.end_date AS CHAR), '')) <> '')
      THEN CASE WHEN CURDATE() <= DATE(p.end_date) THEN '접수중' ELSE '마감' END
    ELSE '기간미상'
  END
)
"""


def _trimmed(value: str | None) -> str | None:
    """빈 문자열·공백만 있는 값은 None으로 통일 (필터 미적용)."""
    if value is None:
        return None
    s = value.strip()
    return s or None


def _scalar_to_json(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat(sep=" ", timespec="seconds")
    if isinstance(v, date):
        return v.isoformat()
    return v


def _program_row_to_standard(row: dict[str, Any]) -> dict[str, Any]:
    """
    DB 행을 /support 표준 응답으로 변환합니다.
    reception_* / target / scale 등 표준 키와, 추천·필터용 start_date·end_date 별칭을 함께 둡니다.
    """
    row = dict(row)
    joined = row.pop("keywords_joined", None)
    if isinstance(joined, str) and joined.strip():
        keywords = [k for k in joined.split(",") if k.strip()]
    else:
        keywords = []

    start = _scalar_to_json(row.get("start_date"))
    end = _scalar_to_json(row.get("end_date"))
    created_at = _scalar_to_json(row.get("created_at"))

    target = row.get("support_target")
    scale = row.get("support_scale")
    project_period = row.get("project_period")

    return {
        "id": row["id"],
        "title": row.get("title"),
        "category": row.get("category"),
        "source": row.get("source"),
        "organization": row.get("organization"),
        "target": target,
        "scale": scale,
        "description": row.get("description"),
        "reception_start_date": start,
        "reception_end_date": end,
        "project_period": project_period,
        "url": row.get("url"),
        "created_at": created_at,
        "keywords": keywords,
        "start_date": start,
        "end_date": end,
        "support_target": target,
        "support_scale": scale,
    }


def _order_by_clause(sort: str) -> str:
    s = (sort or "").strip().lower()
    if s == "recommended":
        return "ORDER BY p.created_at DESC, p.id DESC"
    if s == "oldest":
        return "ORDER BY p.created_at ASC, p.id ASC"
    if s == "title":
        return (
            "ORDER BY (p.title IS NULL OR TRIM(COALESCE(p.title, '')) = ''), "
            "p.title ASC, p.id ASC"
        )
    if s == "source":
        return (
            "ORDER BY (p.source IS NULL OR TRIM(COALESCE(p.source, '')) = ''), "
            "p.source ASC, p.created_at DESC, p.id DESC"
        )
    # latest, recommended, unknown → 최신순
    return "ORDER BY p.created_at DESC, p.id DESC"


def list_programs(
    category: str | None = None,
    source: str | None = None,
    keyword: str | None = None,
    reception_status: str | None = None,
    page: int = 1,
    size: int = 9,
    sort: str = "recommended",
) -> dict[str, Any]:
    category = _trimmed(category)
    source = _trimmed(source)
    keyword = _trimmed(keyword)
    reception_status = _trimmed(reception_status)

    page = max(1, int(page))
    size = max(1, min(100, int(size)))
    offset = (page - 1) * size

    order_sql = _order_by_clause(sort)

    base_where = f"""
    WHERE 1=1
    AND (%s IS NULL OR p.category = %s)
    AND (%s IS NULL OR p.source = %s)
    AND (
        %s IS NULL
        OR pk.keyword LIKE CONCAT('%%', %s, '%%')
        OR p.title LIKE CONCAT('%%', %s, '%%')
    )
    AND (%s IS NULL OR {_RECEPTION_STATUS_EXPR.strip()} = %s)
    """

    filter_params: tuple[Any, ...] = (
        category,
        category,
        source,
        source,
        keyword,
        keyword,
        keyword,
        reception_status,
        reception_status,
    )

    count_sql = f"""
    SELECT COUNT(*) AS cnt FROM (
        SELECT DISTINCT p.id
        FROM programs p
        LEFT JOIN program_keywords pk ON pk.program_id = p.id
        {base_where}
    ) t
    """

    data_sql = f"""
    SELECT DISTINCT {_SELECT_PROGRAM_COLUMNS.strip()}
    FROM programs p
    LEFT JOIN program_keywords pk ON pk.program_id = p.id
    {base_where}
    {order_sql}
    LIMIT %s OFFSET %s
    """

    summary_sql = f"""
    SELECT DISTINCT {_SELECT_PROGRAM_COLUMNS.strip()}
    FROM programs p
    LEFT JOIN program_keywords pk ON pk.program_id = p.id
    {base_where}
    """

    data_params = filter_params + (size, offset)
    conn = get_db()
    try:
        ensure_programs_schema(conn)
        with conn.cursor() as cursor:
            logger.info("list_programs count SQL: %s", " ".join(count_sql.split()))
            cursor.execute(count_sql, filter_params)
            count_row = cursor.fetchone() or {}
            total_count = int(count_row.get("cnt") or 0)

            total_pages = math.ceil(total_count / size) if total_count > 0 else 0

            logger.info("list_programs data SQL: %s", " ".join(data_sql.split()))
            cursor.execute(data_sql, data_params)
            rows = cursor.fetchall()
            items = [_program_row_to_standard(dict(row)) for row in rows]

            logger.info("list_programs summary SQL (prefix): summary fetch…")
            cursor.execute(summary_sql, filter_params)
            sum_rows = cursor.fetchall()
            all_std = [_program_row_to_standard(dict(row)) for row in sum_rows]
            summary = build_summary(
                all_std,
                applied_keyword=keyword or "",
                applied_category=category or "",
                applied_source=source or "",
            )

            logger.info(
                "list_programs page=%s size=%s total_count=%s items=%s",
                page,
                size,
                total_count,
                len(items),
            )

            return {
                "items": items,
                "page": page,
                "size": size,
                "total_count": total_count,
                "total_pages": total_pages,
                "summary": summary,
            }
    finally:
        conn.close()
