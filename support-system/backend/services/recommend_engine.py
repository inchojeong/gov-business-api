"""
1차 rule-based 키워드 추천 엔진.
programs + program_keywords 기반 점수 산정 (ML·로그 없음).
"""
from __future__ import annotations

import logging
import re
import unicodedata
from datetime import date, datetime, timedelta
from typing import Any

from database import ensure_programs_schema, get_db

from .recommend_stats import _parse_date_loose, get_reception_status

logger = logging.getLogger(__name__)

SCORE_TITLE = 5
SCORE_PROGRAM_KEYWORD = 4
SCORE_CATEGORY = 3
SCORE_SUPPORT_TARGET = 3
SCORE_DESCRIPTION = 1
SCORE_RECEPTION_OPEN = 2
SCORE_RECENT_7D = 1

MAX_QUERY_TOKENS = 20


def normalize_keyword(text: str | None) -> str:
    """
    키워드·문장 비교용 정규화: NFKC, trim, 소문자, 공백 축약.
    """
    if text is None:
        return ""
    s = unicodedata.normalize("NFKC", str(text))
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def tokenize_query_keywords(raw: str | None) -> list[str]:
    """쉼표·세미콜론·개행·공백으로 구분된 조회 키워드를 정규화·중복 제거(순서 유지). 최대 MAX_QUERY_TOKENS개."""
    if raw is None or not str(raw).strip():
        return []
    parts = re.split(r"[,;\n\r]+|\s+", str(raw).strip())
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        if len(out) >= MAX_QUERY_TOKENS:
            break
        n = normalize_keyword(p)
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def _trimmed(value: str | None) -> str | None:
    if value is None:
        return None
    s = value.strip()
    return s or None


def _scalar_dates(row: dict[str, Any]) -> tuple[str | None, str | None, Any]:
    def _s(v: Any) -> str | None:
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat(sep=" ", timespec="seconds")
        if isinstance(v, date):
            return v.isoformat()
        t = str(v).strip()
        return t or None

    return _s(row.get("start_date")), _s(row.get("end_date")), row.get("created_at")


def _naive_datetime(v: datetime) -> datetime:
    """비교용 naive datetime (timezone 있으면 로컬로 변환 후 tz 제거)."""
    if v.tzinfo is not None:
        return v.astimezone().replace(tzinfo=None)
    return v


def _created_within_7_days(created_at: Any, *, now: datetime | None = None) -> bool:
    """created_at이 문자열·date·datetime(aware/naive) 섞여도 예외 없이 7일 이내 여부만 판단."""
    if created_at is None:
        return False
    ref = _naive_datetime(now or datetime.now())
    cutoff = ref - timedelta(days=7)

    c_naive: datetime | None = None
    if isinstance(created_at, datetime):
        c_naive = _naive_datetime(created_at)
    elif isinstance(created_at, date):
        c_naive = datetime.combine(created_at, datetime.min.time())
    else:
        raw = str(created_at).strip()
        if not raw:
            return False
        c_naive = None
        s_iso = raw.replace(" ", "T", 1)
        if s_iso.endswith("Z"):
            s_iso = s_iso[:-1] + "+00:00"
        try:
            c_naive = _naive_datetime(datetime.fromisoformat(s_iso))
        except ValueError:
            d = _parse_date_loose(raw)
            if d is not None:
                c_naive = datetime.combine(d, datetime.min.time())
        if c_naive is None:
            return False

    return c_naive >= cutoff


def _program_keyword_list(keywords_joined: str | None) -> list[str]:
    if not keywords_joined or not str(keywords_joined).strip():
        return []
    return [normalize_keyword(k) for k in str(keywords_joined).split(",") if normalize_keyword(k)]


def _build_candidate_where(tokens: list[str]) -> tuple[str, tuple[Any, ...]]:
    """토큰이 title·description·support_target·program_keywords 중 하나에라도 나타나는 행만 후보."""
    if not tokens:
        return "1=0", ()

    parts: list[str] = []
    params: list[Any] = []
    for kw in tokens:
        low = kw.lower()
        parts.append("LOCATE(%s, LOWER(COALESCE(p.title, ''))) > 0")
        params.append(low)
        parts.append("LOCATE(%s, LOWER(COALESCE(p.description, ''))) > 0")
        params.append(low)
        parts.append("LOCATE(%s, LOWER(COALESCE(p.support_target, ''))) > 0")
        params.append(low)
        parts.append(
            "EXISTS (SELECT 1 FROM program_keywords pkx WHERE pkx.program_id = p.id "
            "AND LOCATE(%s, LOWER(COALESCE(pkx.keyword, ''))) > 0)"
        )
        params.append(low)

    return "(" + " OR ".join(parts) + ")", tuple(params)


def _score_row(
    row: dict[str, Any],
    tokens: list[str],
    interest_category: str | None,
) -> tuple[int, list[str], list[str]]:
    """
    (점수, matched_keywords, reason_labels)
    reason_labels는 match_reason 문자열 조합용(한글 라벨).
    """
    title_n = normalize_keyword(row.get("title"))
    desc_n = normalize_keyword(row.get("description"))
    target_n = normalize_keyword(row.get("support_target"))
    prog_cat = normalize_keyword(row.get("category"))
    pk_list = _program_keyword_list(row.get("keywords_joined"))

    score = 0
    matched: set[str] = set()
    labels: list[str] = []

    title_hit = any(t and t in title_n for t in tokens)
    if title_hit:
        score += SCORE_TITLE
        labels.append("제목")
        for t in tokens:
            if t and t in title_n:
                matched.add(t)

    pk_hit = False
    for t in tokens:
        if not t:
            continue
        for pk in pk_list:
            if t == pk or t in pk or pk in t:
                pk_hit = True
                matched.add(t)
                break
        if pk_hit:
            break
    if pk_hit:
        score += SCORE_PROGRAM_KEYWORD
        labels.append("키워드")

    ic = normalize_keyword(interest_category) if interest_category else ""
    if ic and prog_cat == ic:
        score += SCORE_CATEGORY
        labels.append("카테고리")

    st_hit = any(t and t in target_n for t in tokens)
    if st_hit:
        score += SCORE_SUPPORT_TARGET
        labels.append("지원대상")
        for t in tokens:
            if t and t in target_n:
                matched.add(t)

    desc_hit = any(t and t in desc_n for t in tokens)
    if desc_hit:
        score += SCORE_DESCRIPTION
        labels.append("본문")
        for t in tokens:
            if t and t in desc_n:
                matched.add(t)

    start_s, end_s, _ = _scalar_dates(row)
    recv = get_reception_status(start_s, end_s)
    if recv == "접수중":
        score += SCORE_RECEPTION_OPEN
        labels.append("접수중")

    if _created_within_7_days(row.get("created_at")):
        score += SCORE_RECENT_7D
        labels.append("최근등록")

    return score, sorted(matched), labels


def _labels_to_match_reason(labels: list[str]) -> str:
    if not labels:
        return ""
    # 표시 순서 정리
    order = ["제목", "키워드", "카테고리", "지원대상", "본문", "접수중", "최근등록"]
    seen = set()
    ordered: list[str] = []
    for key in order:
        if key in labels and key not in seen:
            seen.add(key)
            ordered.append(key)
    for lb in labels:
        if lb not in seen:
            seen.add(lb)
            ordered.append(lb)
    return ", ".join(ordered)


def recommend_programs(
    *,
    keywords: str,
    interest_category: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """
    키워드 기반 추천 목록.
    - keywords: 공백/쉼표 등으로 구분된 조회 문자열
    - interest_category: 있으면 프로그램 category와 정규화 일치 시 +3
    - limit: 1~100
    """
    tokens = tokenize_query_keywords(keywords)
    interest_category = _trimmed(interest_category)
    limit = max(1, min(100, int(limit)))

    if not tokens:
        return {"items": []}

    where_kw, kw_params = _build_candidate_where(tokens)

    # program_keywords는 EXISTS·서브쿼리만 사용 (LEFT JOIN 시 동일 program 다중 row 가능)
    sql = f"""
    SELECT
        p.id,
        p.title,
        p.description,
        p.category,
        p.source,
        p.support_target,
        p.start_date,
        p.end_date,
        p.created_at,
        (
            SELECT GROUP_CONCAT(DISTINCT pk2.keyword ORDER BY pk2.keyword SEPARATOR ',')
            FROM program_keywords pk2
            WHERE pk2.program_id = p.id
        ) AS keywords_joined
    FROM programs p
    WHERE {where_kw}
    """

    conn = get_db()
    try:
        ensure_programs_schema(conn)
        with conn.cursor() as cursor:
            logger.info("recommend_engine: candidate SQL (normalized whitespace)")
            cursor.execute(sql, kw_params)
            rows = [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

    by_id: dict[int, dict[str, Any]] = {}
    for row in rows:
        pid = int(row["id"])
        if pid not in by_id:
            by_id[pid] = row

    scored: list[tuple[int, dict[str, Any], list[str], list[str]]] = []
    for row in by_id.values():
        sc, matched, labels = _score_row(row, tokens, interest_category)
        if sc <= 0:
            continue
        pid = int(row["id"])
        start_s, end_s, _ = _scalar_dates(row)
        recv = get_reception_status(start_s, end_s)
        item = {
            "id": pid,
            "title": row.get("title") or "",
            "category": row.get("category"),
            "source": row.get("source"),
            "reception_status": recv,
            "recommend_score": sc,
            "matched_keywords": matched,
            "match_reason": _labels_to_match_reason(labels),
        }
        scored.append((sc, item, matched, labels))

    scored.sort(key=lambda x: (-x[0], -int(x[1]["id"])))
    top = [x[1] for x in scored[:limit]]

    return {"items": top}
