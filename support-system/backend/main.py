import logging

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from collectors.gov_collector import collect_gov_programs
from collectors.msit_collector import collect_msit_programs
from services.keyword_service import run_process_keywords
from services.programs_service import list_programs
from services.recommend_engine import recommend_programs as run_recommend_programs

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "FastAPI 정상 작동"}


@app.post("/collect")
def collect_support_programs(
    page: int = Query(1),
    per_page: int = Query(50),
):
    return collect_gov_programs(page=page, per_page=per_page)


@app.post("/collect-msit")
def collect_msit_programs_route(
    start_page: int = Query(1),
    page_count: int = Query(3),
    per_page: int = Query(10),
):
    """
    과학기술정보통신부 사업공고 API 수집
    - per_page는 10 권장
    - start_page=1, page_count=3이면 1~3페이지 총 30건 수집
    """
    return collect_msit_programs(
        start_page=start_page,
        page_count=page_count,
        per_page=per_page,
    )


@app.post("/process-keywords")
def process_keywords():
    return run_process_keywords()


def _sync_step_payload(
    *,
    label: str,
    fn,
) -> dict:
    """Run one sync step; never raises. Returns { success, error, result }."""
    step: dict = {"success": False, "error": None, "result": None}
    logger.info("sync-supports: [%s] 단계 시작", label)
    try:
        result = fn()
        step["result"] = result
        if isinstance(result, dict) and result.get("success") is False:
            step["error"] = result.get("message") or f"{label} 단계가 실패했습니다."
            logger.error("sync-supports: [%s] 단계 실패 — %s", label, step["error"])
        else:
            step["success"] = True
            rk = list(result.keys()) if isinstance(result, dict) else type(result).__name__
            logger.info("sync-supports: [%s] 단계 성공 result=%s", label, rk)
    except Exception as exc:  # noqa: BLE001 — intentional per-step isolation
        step["error"] = str(exc)
        step["result"] = None
        logger.exception("sync-supports: [%s] 단계 예외 — %s", label, exc)
    logger.info("sync-supports: [%s] 단계 종료 success=%s", label, step["success"])
    return step


@app.post("/sync-supports")
def sync_supports():
    """
    GOV 수집 → MSIT 수집 → 키워드 처리를 순서대로 실행합니다.
    한 단계가 예외로 중단되어도 다음 단계는 시도하며, 각 단계 결과·에러를 반환합니다.
    """
    logger.info("sync-supports: 파이프라인 시작 (GOV 50건/페이지, MSIT 3페이지×30건)")
    gov = _sync_step_payload(
        label="GOV",
        fn=lambda: collect_gov_programs(page=1, per_page=50),
    )
    msit = _sync_step_payload(
        label="MSIT",
        fn=lambda: collect_msit_programs(
            start_page=1,
            page_count=3,
            per_page=30,
        ),
    )
    keywords = _sync_step_payload(
        label="키워드",
        fn=run_process_keywords,
    )

    all_success = gov["success"] and msit["success"] and keywords["success"]
    logger.info("sync-supports: 파이프라인 종료 all_success=%s", all_success)

    return {
        "all_success": all_success,
        "gov_collect": gov,
        "msit_collect": msit,
        "process_keywords": keywords,
    }


def _empty_to_none(v: str | None) -> str | None:
    """쿼리스트링의 빈 문자열을 None으로 (list_programs에서 다시 trim)."""
    if v is None:
        return None
    return v if v != "" else None


@app.get("/recommend-programs")
def recommend_programs_route(
    keywords: str = Query("", max_length=500),
    category: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """rule-based 키워드 추천(1차). keywords가 비면 빈 items."""
    return run_recommend_programs(
        keywords=_empty_to_none(keywords) or "",
        interest_category=_empty_to_none(category),
        limit=limit,
    )


@app.get("/support")
def get_support_programs(
    category: str | None = Query(None),
    source: str | None = Query(None),
    keyword: str | None = Query(None),
    reception_status: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(9, ge=1, le=100),
    sort: str = Query("recommended"),
):
    return list_programs(
        category=_empty_to_none(category),
        source=_empty_to_none(source),
        keyword=_empty_to_none(keyword),
        reception_status=_empty_to_none(reception_status),
        page=page,
        size=size,
        sort=sort or "recommended",
    )
