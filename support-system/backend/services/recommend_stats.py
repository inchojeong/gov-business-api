"""
프론트 lib/recommendScore.ts와 동일한 규칙으로 요약 지표용 점수·접수 상태를 계산합니다.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any


def _parse_date_loose(raw: str | None) -> date | None:
    if raw is None:
        return None
    s = str(raw).strip().replace(".", "-")
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(s[:26], fmt).date()
        except ValueError:
            continue
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        y, mo, d = int(m[1]), int(m[2]), int(m[3])
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    return None


def _start_of_day(d: date) -> date:
    return d


def is_reception_open(
    start_date: str | None,
    end_date: str | None,
    now: date | None = None,
) -> bool:
    today = _start_of_day(now or date.today())
    start = _parse_date_loose(start_date)
    end = _parse_date_loose(end_date)

    if start is None and end is None:
        return False
    if start is not None and end is not None:
        return today >= start and today <= end
    if end is not None and start is None:
        return today <= end
    if start is not None and end is None:
        return today >= start
    return False


def get_reception_status(
    start_date: str | None,
    end_date: str | None,
    now: date | None = None,
) -> str:
    today = _start_of_day(now or date.today())
    start = _parse_date_loose(start_date)
    end = _parse_date_loose(end_date)

    if start is None and end is None:
        return "기간미상"
    if start is not None and end is not None:
        if today < start:
            return "예정"
        if today > end:
            return "마감"
        return "접수중"
    if start is not None and end is None:
        return "예정" if today < start else "접수중"
    if start is None and end is not None:
        return "접수중" if today <= end else "마감"
    return "기간미상"


def _year_month_from_created_at(created_at: Any) -> str | None:
    """created_at에서 'YYYY-MM' 키 반환. 없거나 파싱 불가면 None."""
    if created_at is None:
        return None
    if isinstance(created_at, datetime):
        c = created_at
    elif isinstance(created_at, date):
        c = datetime.combine(created_at, datetime.min.time())
    else:
        s = str(created_at).strip().replace(".", "-")
        if not s:
            return None
        try:
            c = datetime.fromisoformat(s.replace(" ", "T", 1)[:19])
        except ValueError:
            d = _parse_date_loose(s)
            if d is None:
                return None
            c = datetime.combine(d, datetime.min.time())
    return f"{c.year:04d}-{c.month:02d}"


def max_created_at_from_programs(programs: list[dict[str, Any]]) -> datetime | None:
    mx: datetime | None = None
    for p in programs:
        raw = p.get("created_at")
        if raw is None:
            continue
        if isinstance(raw, datetime):
            c = raw
        elif isinstance(raw, date):
            c = datetime.combine(raw, datetime.min.time())
        else:
            s = str(raw).strip().replace(".", "-")
            try:
                c = datetime.fromisoformat(s.replace(" ", "T", 1)[:19])
            except ValueError:
                continue
        if mx is None or c > mx:
            mx = c
    return mx


def _keyword_matches_title_or_list(
    needle: str,
    title: str | None,
    keywords: list[str] | None,
) -> bool:
    n = needle.strip().lower()
    if not n:
        return False
    t = (title or "").lower()
    if n in t:
        return True
    for k in keywords or []:
        kk = (k or "").strip().lower()
        if kk and (n in kk or (len(n) >= 2 and kk in n)):
            return True
    return False


def _is_recent_notice(created_at: Any, max_created: datetime | None) -> bool:
    if max_created is None:
        return False
    if created_at is None:
        return False
    if isinstance(created_at, datetime):
        c = created_at
    elif isinstance(created_at, date):
        c = datetime.combine(created_at, datetime.min.time())
    else:
        s = str(created_at).strip().replace(".", "-")
        try:
            c = datetime.fromisoformat(s.replace(" ", "T", 1)[:19])
        except ValueError:
            return False
    ms_per_day = 86400000
    return c.timestamp() >= max_created.timestamp() - 7 * ms_per_day


def compute_recommend_score(
    program: dict[str, Any],
    ctx: dict[str, Any],
) -> tuple[int, str]:
    """반환: (score, tier) tier는 '추천'|'검토'|'일반'"""
    score = 0
    kw = str(ctx.get("applied_keyword") or "").strip()
    title = program.get("title")
    kws = program.get("keywords") or []

    if kw and _keyword_matches_title_or_list(kw, title if isinstance(title, str) else None, kws):
        score += 30

    cat = str(ctx.get("applied_category") or "").strip()
    if cat and str(program.get("category") or "").strip() == cat:
        score += 30

    src = str(ctx.get("applied_source") or "").strip()
    if src and str(program.get("source") or "").strip() == src:
        score += 10

    def _as_date_str(v: Any) -> str | None:
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat(sep=" ", timespec="seconds")
        if isinstance(v, date):
            return v.isoformat()
        s = str(v).strip()
        return s or None

    if is_reception_open(_as_date_str(program.get("start_date")), _as_date_str(program.get("end_date"))):
        score += 20

    max_ca = ctx.get("max_created_at")
    if _is_recent_notice(program.get("created_at"), max_ca):
        score += 10

    tier = "추천" if score >= 70 else "검토" if score >= 40 else "일반"
    return score, tier


def count_registered_last_7_days(programs: list[dict[str, Any]], today: date | None = None) -> int:
    t0 = _start_of_day(today or date.today())
    cutoff = date.fromordinal(t0.toordinal() - 7)
    n = 0
    for p in programs:
        raw = p.get("created_at")
        if raw is None:
            continue
        if isinstance(raw, datetime):
            cd = raw.date()
        elif isinstance(raw, date):
            cd = raw
        else:
            s = str(raw).strip().replace(".", "-")
            try:
                cd = datetime.fromisoformat(s.replace(" ", "T", 1)[:10]).date()
            except ValueError:
                continue
        if cd >= cutoff:
            n += 1
    return n


def build_summary(
    programs_std: list[dict[str, Any]],
    *,
    applied_keyword: str,
    applied_category: str,
    applied_source: str,
) -> dict[str, Any]:
    """programs_std: _program_row_to_standard 결과 리스트(전체 필터 매칭 분)"""
    max_ca = max_created_at_from_programs(programs_std)
    max_iso = max_ca.isoformat(sep=" ", timespec="seconds") if max_ca else None
    ctx = {
        "applied_keyword": applied_keyword,
        "applied_category": applied_category,
        "applied_source": applied_source,
        "max_created_at": max_ca,
    }
    open_n = 0
    rec_n = 0
    recent7 = count_registered_last_7_days(programs_std)
    by_cat: dict[str, int] = {}
    by_src: dict[str, int] = {}
    by_recv: dict[str, int] = {}
    by_month_counts: dict[str, int] = {}

    for p in programs_std:
        if is_reception_open(p.get("start_date"), p.get("end_date")):
            open_n += 1
        _, tier = compute_recommend_score(p, ctx)
        if tier == "추천":
            rec_n += 1
        ckey = (p.get("category") or "").strip() or "미분류"
        by_cat[ckey] = by_cat.get(ckey, 0) + 1
        sraw = (p.get("source") or "").strip().upper()
        skey = sraw if sraw else "기타"
        by_src[skey] = by_src.get(skey, 0) + 1
        rs = get_reception_status(p.get("start_date"), p.get("end_date"))
        by_recv[rs] = by_recv.get(rs, 0) + 1
        ym = _year_month_from_created_at(p.get("created_at"))
        if ym is not None:
            by_month_counts[ym] = by_month_counts.get(ym, 0) + 1

    by_month = [{"month": m, "count": by_month_counts[m]} for m in sorted(by_month_counts.keys())]

    return {
        "open": open_n,
        "recommend": rec_n,
        "recent7": recent7,
        "by_category": by_cat,
        "by_source": by_src,
        "by_reception_status": by_recv,
        "by_month": by_month,
        "max_created_at": max_iso,
    }
