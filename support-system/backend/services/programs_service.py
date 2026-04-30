import logging
from datetime import date, datetime
from typing import Any

from database import ensure_programs_schema, get_db

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


def list_programs(
    category: str | None = None,
    source: str | None = None,
    keyword: str | None = None,
) -> list:
    category = _trimmed(category)
    source = _trimmed(source)
    keyword = _trimmed(keyword)

    sql = f"""
    SELECT DISTINCT {_SELECT_PROGRAM_COLUMNS.strip()}
    FROM programs p
    LEFT JOIN program_keywords pk ON pk.program_id = p.id
    WHERE 1=1
    AND (%s IS NULL OR p.category = %s)
    AND (%s IS NULL OR p.source = %s)
    AND (
        %s IS NULL
        OR pk.keyword LIKE CONCAT('%%', %s, '%%')
        OR p.title LIKE CONCAT('%%', %s, '%%')
    )
    ORDER BY p.id DESC
    LIMIT 100
    """
    params = (
        category,
        category,
        source,
        source,
        keyword,
        keyword,
        keyword,
    )

    conn = get_db()
    try:
        ensure_programs_schema(conn)
        with conn.cursor() as cursor:
            logger.info("list_programs SQL (whitespace normalized): %s", " ".join(sql.split()))
            logger.info("list_programs params: %s", params)
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            logger.info("list_programs result count: %s", len(rows))
            return [_program_row_to_standard(dict(row)) for row in rows]
    finally:
        conn.close()
