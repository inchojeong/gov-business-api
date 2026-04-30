import logging

from keyword_processor import process_all_program_keywords

logger = logging.getLogger(__name__)


def run_process_keywords() -> dict:
    result = process_all_program_keywords()
    if isinstance(result, dict) and result.get("success") is False:
        logger.error("키워드 처리 실패: %s", result.get("message"))
        return {
            "success": False,
            "message": result.get("message") or "키워드 처리 실패",
            "fetched_count": result.get("fetched_count", 0),
            "inserted_count": result.get("inserted_count", 0),
            "skipped_count": result.get("skipped_count", 0),
            "updated_count": result.get("updated_count", 0),
            "error_count": result.get("error_count", 1),
            "processed_count": result.get("processed_count", 0),
            "keyword_count": result.get("keyword_count", 0),
        }
    return {
        "success": True,
        "message": "키워드 생성 완료",
        "processed_count": result.get("processed_count", 0),
        "keyword_count": result.get("keyword_count", 0),
        "fetched_count": result.get("fetched_count", 0),
        "inserted_count": result.get("inserted_count", 0),
        "skipped_count": result.get("skipped_count", 0),
        "updated_count": result.get("updated_count", 0),
        "error_count": result.get("error_count", 0),
    }
