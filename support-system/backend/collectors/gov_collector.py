import json
import os
from typing import Any, Dict

import requests
from dotenv import load_dotenv

from database import get_db

load_dotenv()

GOV_API_BASE_URL = os.getenv("GOV_API_BASE_URL")
SERVICE_KEY = os.getenv("SERVICE_KEY")


def collect_gov_programs(page: int = 1, per_page: int = 50) -> Dict[str, Any]:
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
