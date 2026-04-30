from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from collectors.gov_collector import collect_gov_programs
from collectors.msit_collector import collect_msit_programs
from database import get_db
from keyword_processor import process_all_program_keywords

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
    result = process_all_program_keywords()

    return {
        "success": True,
        "message": "키워드 생성 완료",
        "processed_count": result["processed_count"],
        "keyword_count": result["keyword_count"],
    }


@app.get("/support")
def get_support_programs(
    keyword: str = "",
):
    conn = get_db()

    try:
        with conn.cursor() as cursor:
            if keyword:
                sql = """
                SELECT *
                FROM support_programs
                WHERE business_name LIKE %s
                   OR target_text LIKE %s
                   OR category LIKE %s
                   OR department LIKE %s
                ORDER BY id DESC
                LIMIT 100
                """
                like_keyword = f"%{keyword}%"
                cursor.execute(sql, (like_keyword, like_keyword, like_keyword, like_keyword))
            else:
                sql = """
                SELECT *
                FROM support_programs
                ORDER BY id DESC
                LIMIT 100
                """
                cursor.execute(sql)

            rows = cursor.fetchall()

    finally:
        conn.close()

    return rows
