from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import pymysql
import json
import os
from dotenv import load_dotenv

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

# 중소벤처기업부 사업공고목록 API 발급 키
GOV_API_BASE_URL = os.getenv("GOV_API_BASE_URL")
SERVICE_KEY = os.getenv("SERVICE_KEY")

# 과학기술정보통신부 사업공고 API 발급 키
MSIT_API_URL = os.getenv("MSIT_API_URL")
MSIT_SERVICE_KEY = os.getenv("MSIT_SERVICE_KEY")

# MySQL 설정
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "roottbell0518",
    "database": "support_business",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}


def get_db():
    return pymysql.connect(**DB_CONFIG)


@app.get("/")
def root():
    return {"message": "FastAPI 정상 작동"}


@app.post("/collect")
def collect_support_programs(
    page: int = Query(1),
    per_page: int = Query(50),
):
    params = {
        "serviceKey": SERVICE_KEY,
        "page": page,
        "perPage": per_page,
        "returnType": "JSON",
    }

    response = requests.get(GOV_API_BASE_URL, params=params)

    if response.status_code != 200:
        return {
            "success": False,
            "message": "정부 API 호출 실패",
            "status_code": response.status_code,
            "body": response.text,
        }

    data = response.json()
    items = data.get("data", [])

    conn = get_db()
    saved_count = 0

    try:
        with conn.cursor() as cursor:

            cursor.execute("DELETE FROM support_programs")

            for item in items:
                business_name = item.get("사업명") or "사업명 없음"
                category = item.get("분야") or ""
                notice_url = item.get("상세URL") or ""

                # 나머지는 비워도 됨
                target_text = ""
                department = ""
                start_date = ""
                end_date = ""

                sql = """
                INSERT INTO support_programs
                (
                    business_name,
                    target_text,
                    category,
                    department,
                    start_date,
                    end_date,
                    notice_url,
                    raw_data,
                    source
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """

                cursor.execute(
                    sql,
                    (
                        business_name,
                        target_text,
                        category,
                        department,
                        start_date,
                        end_date,
                        notice_url,
                        json.dumps(item, ensure_ascii=False),
                        "중소벤처기업부",
                    ),
                )

                saved_count += 1

        conn.commit()

    finally:
        conn.close()

    return {
        "success": True,
        "message": "수집 완료",
        "saved_count": saved_count,
    }


@app.post("/collect-msit")
def collect_msit_programs(
    start_page: int = Query(1),
    page_count: int = Query(3),
    per_page: int = Query(10),
):
    """
    과학기술정보통신부 사업공고 API 수집
    - per_page는 10 권장
    - start_page=1, page_count=3이면 1~3페이지 총 30건 수집
    """

    conn = get_db()
    saved_count = 0
    failed_pages = []

    try:
        with conn.cursor() as cursor:
            for page in range(start_page, start_page + page_count):
                params = {
                    "ServiceKey": MSIT_SERVICE_KEY,
                    "pageNo": page,
                    "numOfRows": per_page,
                    "returnType": "json",
                }

                response = requests.get(MSIT_API_URL, params=params, timeout=10)

                print("과기정통부 요청 URL:", response.url)
                print("과기정통부 상태코드:", response.status_code)

                if response.status_code != 200:
                    failed_pages.append({
                        "page": page,
                        "status_code": response.status_code,
                        "body": response.text[:300],
                    })
                    continue

                try:
                    data = response.json()
                except Exception:
                    failed_pages.append({
                        "page": page,
                        "status_code": response.status_code,
                        "body": response.text[:300],
                    })
                    continue

                response_data = data.get("response", [])

                body = {}

                if isinstance(response_data, list):
                    for part in response_data:
                        if "body" in part:
                            body = part["body"]
                            break
                elif isinstance(response_data, dict):
                    body = response_data.get("body", {})

                items = body.get("items", [])

                normalized_items = []

                if isinstance(items, list):
                    for row in items:
                        if isinstance(row, dict) and "item" in row:
                            normalized_items.append(row["item"])
                        else:
                            normalized_items.append(row)
                elif isinstance(items, dict):
                    if "item" in items:
                        normalized_items.append(items["item"])
                    else:
                        normalized_items.append(items)

                for item in normalized_items:
                    business_name = item.get("subject") or "사업명 없음"
                    category = "R&D"
                    department = item.get("deptName") or "과학기술정보통신부"
                    notice_url = item.get("viewUrl") or ""
                    start_date = item.get("pressDt") or ""

                    sql = """
                    INSERT INTO support_programs
                    (
                        business_name,
                        target_text,
                        category,
                        department,
                        start_date,
                        end_date,
                        notice_url,
                        raw_data,
                        source
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """

                    cursor.execute(
                        sql,
                        (
                            business_name,
                            "",
                            category,
                            department,
                            start_date,
                            "",
                            notice_url,
                            json.dumps(item, ensure_ascii=False),
                            "과학기술정보통신부",
                        ),
                    )

                    saved_count += 1

        conn.commit()

    finally:
        conn.close()

    return {
        "success": True,
        "message": "과기정통부 API 수집 완료",
        "saved_count": saved_count,
        "failed_pages": failed_pages,
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