from database import get_db


def list_programs(keyword: str = "") -> list:
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            if keyword:
                like_keyword = f"%{keyword}%"
                sql = """
                SELECT
                    id,
                    title,
                    description,
                    category,
                    source,
                    organization,
                    start_date,
                    end_date,
                    url,
                    created_at
                FROM programs
                WHERE title LIKE %s
                   OR description LIKE %s
                   OR category LIKE %s
                   OR organization LIKE %s
                ORDER BY id DESC
                LIMIT 100
                """
                cursor.execute(
                    sql,
                    (like_keyword, like_keyword, like_keyword, like_keyword),
                )
            else:
                sql = """
                SELECT
                    id,
                    title,
                    description,
                    category,
                    source,
                    organization,
                    start_date,
                    end_date,
                    url,
                    created_at
                FROM programs
                ORDER BY id DESC
                LIMIT 100
                """
                cursor.execute(sql)

            return cursor.fetchall()
    finally:
        conn.close()
