"""GOV·MSIT 원본 필드에서 표준 DB 컬럼으로 쓰기 위한 공통 헬퍼."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Mapping


def first_nonempty_str(item: Mapping[str, Any], keys: tuple[str, ...]) -> str | None:
    for k in keys:
        v = item.get(k)
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s
    return None


def normalize_date_value(raw: str | None) -> str | None:
    """
    DB·API에서 쓰기 쉬운 YYYY-MM-DD 문자열로 정규화.
    원본이 YYYYMMDD, YYYY.MM.DD, ISO 등이면 처리하고, 파싱 불가면 None.
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None

    if isinstance(raw, (date, datetime)):
        d = raw.date() if isinstance(raw, datetime) else raw
        return d.isoformat()

    s = s.replace(".", "-").replace("/", "-")

    m = re.match(r"^(\d{4})[-.]?(\d{1,2})[-.]?(\d{1,2})", s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return date(y, mo, d).isoformat()
        except ValueError:
            pass

    m8 = re.search(r"(\d{8})", s)
    if m8:
        chunk = m8.group(1)
        try:
            y, mo, d = int(chunk[:4]), int(chunk[4:6]), int(chunk[6:8])
            return date(y, mo, d).isoformat()
        except ValueError:
            pass

    return None


def join_description_parts(parts: list[str | None], *, max_len: int = 8000) -> str:
    texts = [p.strip() for p in parts if p and str(p).strip()]
    if not texts:
        return ""
    out = "\n\n".join(texts)
    if len(out) > max_len:
        return out[: max_len - 1] + "…"
    return out
