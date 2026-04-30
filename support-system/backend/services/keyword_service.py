from keyword_processor import process_all_program_keywords


def run_process_keywords() -> dict:
    result = process_all_program_keywords()
    return {
        "success": True,
        "message": "키워드 생성 완료",
        "processed_count": result["processed_count"],
        "keyword_count": result["keyword_count"],
    }
