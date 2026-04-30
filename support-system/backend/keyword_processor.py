from database import get_db

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

def save_program_keywords(conn, program_id: int, keywords: list):
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

    conn.commit()

def process_all_program_keywords():
    conn = get_db()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, full_text
                FROM support_programs
                WHERE full_text IS NOT NULL
                """
            )
            rows = cursor.fetchall()

        processed_count = 0
        keyword_count = 0

        for row in rows:
            program_id = row[0]
            full_text = row[1] or ""

            keywords = extract_keywords(full_text)

            if keywords:
                save_program_keywords(conn, program_id, keywords)
                keyword_count += len(keywords)

            processed_count += 1

        return {
            "processed_count": processed_count,
            "keyword_count": keyword_count,
        }

    finally:
        conn.close()