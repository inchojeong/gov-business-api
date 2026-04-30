import logging

from database import ensure_programs_schema, get_db

logger = logging.getLogger(__name__)

KEYWORD_DICT = {
    "tech": ["AI", "인공지능", "데이터", "빅데이터", "클라우드", "SaaS", "DX", "AX", "디지털전환"],
    "industry": ["제조", "스마트공장", "농업", "식품", "바이오", "콘텐츠", "출판", "인쇄", "관광", "수산"],
    "support": ["사업화", "R&D", "기술개발", "시제품", "마케팅", "컨설팅", "수출", "해외진출", "금융", "자금"],
    "policy": ["탄소", "탄소중립", "ESG", "친환경", "에너지", "지역", "청년"],
}

def extract_keywords(text: str):
    if not text:
        return []

    results = []

    for keyword_type, keywords in KEYWORD_DICT.items():
        for keyword in keywords:
            if keyword.lower() in text.lower():
                results.append({
                    "keyword": keyword,
                    "keyword_type": keyword_type,
                    "weight": 1.0,
                    "source": "rule",
                })

    return results

def save_program_keywords(conn, program_id: int, keywords: list) -> tuple[int, int]:
    """(신규 삽입 행 수, 기존 행 갱신 수) — MySQL rowcount 규칙(1=insert, 2=update)에 따름."""
    inserted = 0
    updated = 0
    with conn.cursor() as cursor:
        for item in keywords:
            cursor.execute(
                """
                INSERT INTO program_keywords
                    (program_id, keyword, keyword_type, weight, source)
                VALUES
                    (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    keyword_type = VALUES(keyword_type),
                    weight = VALUES(weight),
                    source = VALUES(source)
                """,
                (
                    program_id,
                    item["keyword"],
                    item["keyword_type"],
                    item["weight"],
                    item["source"],
                ),
            )
            rc = cursor.rowcount
            if rc == 1:
                inserted += 1
            elif rc == 2:
                updated += 1

    conn.commit()
    return inserted, updated

def process_all_program_keywords() -> dict:
    logger.info("키워드 처리 시작")
    conn = get_db()

    try:
        ensure_programs_schema(conn)
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    description,
                    category,
                    organization,
                    support_target
                FROM programs
                WHERE CONCAT(
                    COALESCE(title, ''),
                    COALESCE(description, ''),
                    COALESCE(category, ''),
                    COALESCE(organization, ''),
                    COALESCE(support_target, '')
                ) <> ''
                """
            )
            rows = cursor.fetchall()

        processed_count = 0
        keyword_row_total = 0
        inserted_count = 0
        updated_count = 0
        skipped_count = 0

        try:
            for row in rows:
                program_id = row["id"]
                full_text = " ".join(
                    [
                        row.get("title") or "",
                        row.get("description") or "",
                        row.get("category") or "",
                        row.get("organization") or "",
                        row.get("support_target") or "",
                    ]
                )

                keywords = extract_keywords(full_text)

                if keywords:
                    ins, upd = save_program_keywords(conn, program_id, keywords)
                    inserted_count += ins
                    updated_count += upd
                    keyword_row_total += ins + upd
                else:
                    skipped_count += 1

                processed_count += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("키워드 처리 중 오류: %s", exc)
            try:
                conn.rollback()
            except Exception:  # noqa: BLE001
                pass
            return {
                "success": False,
                "message": str(exc),
                "processed_count": processed_count,
                "keyword_count": keyword_row_total,
                "fetched_count": len(rows),
                "inserted_count": inserted_count,
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "error_count": 1,
            }

        logger.info(
            "키워드 처리 종료 programs=%s keyword_rows=%s inserted=%s updated=%s no_match=%s",
            processed_count,
            keyword_row_total,
            inserted_count,
            updated_count,
            skipped_count,
        )
        return {
            "success": True,
            "processed_count": processed_count,
            "keyword_count": keyword_row_total,
            "fetched_count": len(rows),
            "inserted_count": inserted_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "error_count": 0,
        }

    finally:
        conn.close()
