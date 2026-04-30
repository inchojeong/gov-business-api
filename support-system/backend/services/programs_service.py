import logging

from database import get_db

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
    p.created_at
"""


def _trimmed(value: str | None) -> str | None:
    if value is None:
        return None
    s = value.strip()
    return s or None


def list_programs(
    category: str | None = None,
    source: str | None = None,
    keyword: str | None = None,
) -> list:
    category = _trimmed(category)
    source = _trimmed(source)
    keyword = _trimmed(keyword)

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            has_any_filter = bool(category or source or keyword)

            if not has_any_filter:
                sql = "SELECT * FROM programs ORDER BY id DESC LIMIT 100"
                cursor.execute(sql)
            else:
                conditions: list[str] = []
                params: list = []

                if category:
                    conditions.append("p.category = %s")
                    params.append(category)
                if source:
                    conditions.append("p.source = %s")
                    params.append(source)
                if keyword:
                    conditions.append("pk.keyword = %s")
                    params.append(keyword)

                where_sql = " AND ".join(conditions)

                if keyword:
                    join_sql = (
                        "INNER JOIN program_keywords pk ON pk.program_id = p.id"
                    )
                    select_head = f"SELECT DISTINCT {_SELECT_PROGRAM_COLUMNS.strip()}"
                else:
                    join_sql = ""
                    select_head = f"SELECT {_SELECT_PROGRAM_COLUMNS.strip()}"

                join_clause = f"\n{join_sql}\n" if join_sql else "\n"

                sql = f"""
                {select_head}
                FROM programs p{join_clause}WHERE {where_sql}
                ORDER BY p.id DESC
                LIMIT 100
                """

                cursor.execute(sql, tuple(params))

            rows = cursor.fetchall()
            logger.info("list_programs: fetched %s row(s)", len(rows))
            return rows
    finally:
        conn.close()
