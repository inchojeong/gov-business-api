from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from collectors.gov_collector import collect_gov_programs
from collectors.msit_collector import collect_msit_programs
from services.keyword_service import run_process_keywords
from services.programs_service import list_programs

load_dotenv()

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


@app.get("/support")
def get_support_programs(
    keyword: str = "",
):
    return list_programs(keyword=keyword)
