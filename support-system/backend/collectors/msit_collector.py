import os
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv

from collectors.field_mapping import (
    first_nonempty_str,
    join_description_parts,
    normalize_date_value,
)
from database import ensure_programs_schema, get_db

load_dotenv()

MSIT_API_URL = os.getenv("MSIT_API_URL")
MSIT_SERVICE_KEY = os.getenv("MSIT_SERVICE_KEY")

_MSIT_TITLE_KEYS = ("subject", "title", "bizTitle", "사업명")
_MSIT_URL_KEYS = ("viewUrl", "url", "link", "detailUrl")
_MSIT_ORG_KEYS = ("deptName", "organNm", "chargeDept", "주관기관")
_MSIT_CATEGORY_KEYS = ("bizType", "category", "typeNm", "구분")
_MSIT_TARGET_KEYS = ("supportTrget", "target", "reqstTrget", "지원대상")
_MSIT_SCALE_KEYS = ("supportScale", "scale", "budget", "지원규모")
_MSIT_PERIOD_KEYS = ("taskPeriod", "performPeriod", "projectPeriod", "bsnsPeriod", "사업기간")
_MSIT_DESC_KEYS = ("contents", "content", "htmlCn", "cn", "description", "공고내용")
_MSIT_START_KEYS = (
    "reqstBeginDe",
    "applcntBeginDt",
    "applicationStartDate",
    "rcvsgnBeginDt",
    "접수시작일",
    "신청시작일",
)
_MSIT_END_KEYS = (
    "reqstEndDe",
    "applcntEndDt",
    "applicationEndDate",
    "rcvsgnEndDt",
    "접수종료일",
    "신청종료일",
)
_MSIT_PRESS_KEYS = ("pressDt", "registDt", "creatDt", "등록일")


def _map_msit_item_to_row(item: Dict[str, Any]) -> Dict[str, Any] | None:
    url = (first_nonempty_str(item, _MSIT_URL_KEYS) or "").strip()
    if not url:
        return None

    title = first_nonempty_str(item, _MSIT_TITLE_KEYS) or "사업명 없음"
    organization = first_nonempty_str(item, _MSIT_ORG_KEYS) or "과학기술정보통신부"
    category = first_nonempty_str(item, _MSIT_CATEGORY_KEYS) or "R&D"
    support_target = first_nonempty_str(item, _MSIT_TARGET_KEYS)
    support_scale = first_nonempty_str(item, _MSIT_SCALE_KEYS)
    project_period = first_nonempty_str(item, _MSIT_PERIOD_KEYS)

    raw_start = first_nonempty_str(item, _MSIT_START_KEYS)
    raw_end = first_nonempty_str(item, _MSIT_END_KEYS)
    start_date = normalize_date_value(raw_start)
    end_date = normalize_date_value(raw_end)

    if not start_date and not end_date:
        press = first_nonempty_str(item, _MSIT_PRESS_KEYS)
        start_date = normalize_date_value(press)

    desc_parts = [first_nonempty_str(item, (k,)) for k in _MSIT_DESC_KEYS]
    description = join_description_parts([p for p in desc_parts if p])

    return {
        "title": title,
        "description": description,
        "category": category,
        "source": "MSIT",
        "organization": organization,
        "start_date": start_date,
        "end_date": end_date,
        "url": url,
        "support_target": support_target,
        "support_scale": support_scale,
        "project_period": project_period,
    }


def collect_msit_programs(
    start_page: int = 1,
    page_count: int = 3,
    per_page: int = 10,
) -> Dict[str, Any]:
    conn = get_db()
    saved_count = 0
    skipped_count = 0
    failed_pages: List[Dict[str, Any]] = []

    try:
        ensure_programs_schema(conn)
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
                    if not isinstance(item, dict):
                        skipped_count += 1
                        continue

                    row = _map_msit_item_to_row(item)
                    if row is None:
                        skipped_count += 1
                        continue

                    cursor.execute(
                        "SELECT 1 FROM programs WHERE url = %s LIMIT 1",
                        (row["url"],),
                    )
                    if cursor.fetchone() is not None:
                        skipped_count += 1
                        continue

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
                        url,
                        support_target,
                        support_scale,
                        project_period
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """

                    cursor.execute(
                        sql,
                        (
                            row["title"],
                            row["description"],
                            row["category"],
                            row["source"],
                            row["organization"],
                            row["start_date"],
                            row["end_date"],
                            row["url"],
                            row["support_target"],
                            row["support_scale"],
                            row["project_period"],
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
        "skipped_count": skipped_count,
        "failed_pages": failed_pages,
    }
