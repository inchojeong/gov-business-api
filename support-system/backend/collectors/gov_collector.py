import logging
import os
from typing import Any, Dict

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

from collectors.field_mapping import (
    first_nonempty_str,
    join_description_parts,
    normalize_date_value,
)
from database import ensure_programs_schema, get_db

load_dotenv()

GOV_API_BASE_URL = os.getenv("GOV_API_BASE_URL")
SERVICE_KEY = os.getenv("SERVICE_KEY")

# 원본 JSON 키 후보(공공데이터·기업마당 계열에서 자주 쓰이는 표기)
_GOV_TITLE_KEYS = ("사업명", "공고명", "지원사업명", "title")
_GOV_URL_KEYS = ("상세URL", "상세페이지URL", "link", "url", "pblancUrl")
_GOV_CATEGORY_KEYS = ("분야", "사업분야", "지원분야", "category")
_GOV_ORG_KEYS = (
    "소관기관",
    "주관기관",
    "전담기관",
    "수행기관",
    "소관부처",
    "organization",
)
_GOV_TARGET_KEYS = ("지원대상", "신청대상", "사업대상", "대상")
_GOV_SCALE_KEYS = ("지원규모", "지원한도", "사업비", "예산")
_GOV_PROJECT_PERIOD_KEYS = ("사업기간", "과제기간", "수행기간", "공고기간")
_GOV_DESC_KEYS = ("사업개요", "공고내용", "지원내용", "내용", "사업내용", "description")
_GOV_START_DATE_KEYS = (
    "접수시작일시",
    "신청시작일시",
    "공고시작일시",
    "접수시작일",
    "신청시작일",
    "접수시작일자",
    "신청시작일자",
    "공고시작일",
    "reqstBeginEndDe",
    "applicationStartDate",
)
_GOV_END_DATE_KEYS = (
    "접수종료일시",
    "신청종료일시",
    "공고종료일시",
    "접수종료일",
    "신청종료일",
    "접수종료일자",
    "신청종료일자",
    "공고종료일",
    "reqstEndDe",
    "applicationEndDate",
)


def _map_gov_item_to_row(item: Dict[str, Any]) -> Dict[str, Any] | None:
    url = (first_nonempty_str(item, _GOV_URL_KEYS) or "").strip()
    if not url:
        return None

    title = first_nonempty_str(item, _GOV_TITLE_KEYS) or "사업명 없음"
    category = first_nonempty_str(item, _GOV_CATEGORY_KEYS) or ""
    organization = (
        first_nonempty_str(item, _GOV_ORG_KEYS) or "중소벤처기업부"
    )
    support_target = first_nonempty_str(item, _GOV_TARGET_KEYS)
    support_scale = first_nonempty_str(item, _GOV_SCALE_KEYS)
    project_period = first_nonempty_str(item, _GOV_PROJECT_PERIOD_KEYS)

    raw_start = first_nonempty_str(item, _GOV_START_DATE_KEYS)
    raw_end = first_nonempty_str(item, _GOV_END_DATE_KEYS)
    start_date = normalize_date_value(raw_start)
    end_date = normalize_date_value(raw_end)

    desc_parts = [first_nonempty_str(item, (k,)) for k in _GOV_DESC_KEYS]
    description = join_description_parts([p for p in desc_parts if p])

    return {
        "title": title,
        "description": description,
        "category": category,
        "source": "GOV",
        "organization": organization,
        "start_date": start_date,
        "end_date": end_date,
        "url": url,
        "support_target": support_target,
        "support_scale": support_scale,
        "project_period": project_period,
    }


def collect_gov_programs(page: int = 1, per_page: int = 50) -> Dict[str, Any]:
    logger.info("GOV 수집 시작 page=%s per_page=%s", page, per_page)
    params = {
        "serviceKey": SERVICE_KEY,
        "page": page,
        "perPage": per_page,
        "returnType": "JSON",
    }

    response = requests.get(GOV_API_BASE_URL, params=params, timeout=30)

    if response.status_code != 200:
        logger.error(
            "GOV 수집 API 실패 status=%s body_prefix=%s",
            response.status_code,
            (response.text or "")[:400],
        )
        return {
            "success": False,
            "message": "정부 API 호출 실패",
            "status_code": response.status_code,
            "body": response.text,
            "fetched_count": 0,
            "inserted_count": 0,
            "skipped_count": 0,
            "updated_count": 0,
            "error_count": 1,
        }

    try:
        data = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.exception("GOV 수집 JSON 파싱 실패: %s", exc)
        return {
            "success": False,
            "message": "정부 API 응답 파싱 실패",
            "fetched_count": 0,
            "inserted_count": 0,
            "skipped_count": 0,
            "updated_count": 0,
            "error_count": 1,
        }

    items = data.get("data", [])
    if not isinstance(items, list):
        items = []
    fetched_count = len(items)
    logger.info("GOV 수집 API 응답 건수 fetched_count=%s", fetched_count)

    conn = get_db()
    saved_count = 0
    skipped_count = 0

    try:
        ensure_programs_schema(conn)
        with conn.cursor() as cursor:
            for item in items:
                if not isinstance(item, dict):
                    skipped_count += 1
                    continue

                row = _map_gov_item_to_row(item)
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
    except Exception as exc:  # noqa: BLE001
        logger.exception("GOV 수집 DB 처리 실패: %s", exc)
        try:
            conn.rollback()
        except Exception:  # noqa: BLE001
            pass
        return {
            "success": False,
            "message": f"DB 저장 중 오류: {exc}",
            "fetched_count": fetched_count,
            "inserted_count": saved_count,
            "skipped_count": skipped_count,
            "updated_count": 0,
            "error_count": 1,
        }
    finally:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass

    logger.info(
        "GOV 수집 종료 inserted=%s skipped=%s fetched=%s",
        saved_count,
        skipped_count,
        fetched_count,
    )
    return {
        "success": True,
        "message": "수집 완료",
        "saved_count": saved_count,
        "skipped_count": skipped_count,
        "fetched_count": fetched_count,
        "inserted_count": saved_count,
        "updated_count": 0,
        "error_count": 0,
    }
