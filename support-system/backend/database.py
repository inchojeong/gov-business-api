import logging
import os

import pymysql
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}


def get_db():
    return pymysql.connect(**DB_CONFIG)


def ensure_programs_schema(conn) -> None:
    """
    programs 테이블에 표준 확장 컬럼이 없으면 추가합니다.
    기존 환경과 호환되도록 최소 컬럼만 추가합니다.
    """
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'programs'
            """
        )
        existing = {row["COLUMN_NAME"] for row in cursor.fetchall()}

        adds: list[str] = []
        if "support_target" not in existing:
            adds.append("ADD COLUMN support_target TEXT NULL")
        if "support_scale" not in existing:
            adds.append("ADD COLUMN support_scale VARCHAR(512) NULL")
        if "project_period" not in existing:
            adds.append("ADD COLUMN project_period VARCHAR(512) NULL")

        if adds:
            cursor.execute("ALTER TABLE programs " + ", ".join(adds))
            logger.info("programs 테이블 스키마 보강: %s", ", ".join(adds))
    conn.commit()
