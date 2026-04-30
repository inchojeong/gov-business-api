import os
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv

from database import get_db

load_dotenv()

MSIT_API_URL = os.getenv("MSIT_API_URL")
MSIT_SERVICE_KEY = os.getenv("MSIT_SERVICE_KEY")


def collect_msit_programs(
    start_page: int = 1,
    page_count: int = 3,
    per_page: int = 10,
) -> Dict[str, Any]:
    conn = get_db()
    saved_count = 0
    failed_pages: List[Dict[str, Any]] = []

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
                    title = item.get("subject") or "사업명 없음"
                    description = ""
                    category = "R&D"
                    source = "MSIT"
                    organization = item.get("deptName") or "과학기술정보통신부"
                    url = item.get("viewUrl") or ""
                    press_dt = item.get("pressDt") or ""
                    start_date = press_dt if press_dt else None
                    end_date = None

                    sql = """
                    INSERT INTO programs
                    (
                        title,
                        description,
                        category,
                        source,
                        organization,
                        start_date,
                        end_date,
                        url
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """

                    cursor.execute(
                        sql,
                        (
                            title,
                            description,
                            category,
                            source,
                            organization,
                            start_date,
                            end_date,
                            url,
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
