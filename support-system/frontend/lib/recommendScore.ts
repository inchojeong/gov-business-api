export type ProgramForRecommend = {
  title: string | null;
  category: string | null;
  source: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  keywords?: string[] | null;
};

export type RecommendTier = "추천" | "검토" | "일반";
export type ReceptionStatus = "접수중" | "예정" | "마감" | "기간미상";

export type RecommendResult = {
  score: number;
  reasons: string[];
  tier: RecommendTier;
};

function parseDateLoose(raw: string | null | undefined): Date | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim().replace(/\./g, "-").replace(/\s+/g, " ");
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const t = new Date(y, mo, day);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 접수기간이 오늘 기준 진행 중이면 true (날짜 없으면 false). */
export function isReceptionOpen(
  start_date: string | null | undefined,
  end_date: string | null | undefined,
  now: Date = new Date()
): boolean {
  const today = startOfDay(now);
  const start = parseDateLoose(start_date ?? null);
  const end = parseDateLoose(end_date ?? null);

  if (!start && !end) return false;
  if (start && end) {
    const s = startOfDay(start);
    const e = startOfDay(end);
    return today >= s && today <= e;
  }
  if (end && !start) {
    return today <= startOfDay(end);
  }
  if (start && !end) {
    return today >= startOfDay(start);
  }
  return false;
}

export function getReceptionStatus(
  start_date: string | null | undefined,
  end_date: string | null | undefined,
  now: Date = new Date()
): ReceptionStatus {
  const today = startOfDay(now);
  const start = parseDateLoose(start_date ?? null);
  const end = parseDateLoose(end_date ?? null);

  if (!start && !end) return "기간미상";
  if (start && end) {
    const s = startOfDay(start);
    const e = startOfDay(end);
    if (today < s) return "예정";
    if (today > e) return "마감";
    return "접수중";
  }
  if (start && !end) {
    const s = startOfDay(start);
    return today < s ? "예정" : "접수중";
  }
  if (!start && end) {
    const e = startOfDay(end);
    return today <= e ? "접수중" : "마감";
  }
  return "기간미상";
}

function keywordMatchesTitleOrList(
  needle: string,
  title: string | null | undefined,
  keywords: string[] | null | undefined
): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return false;
  const t = (title ?? "").toLowerCase();
  if (t.includes(n)) return true;
  return (keywords ?? []).some((k) => {
    const kk = (k ?? "").trim().toLowerCase();
    return kk && (kk.includes(n) || (n.length >= 2 && n.includes(kk)));
  });
}

function isRecentNotice(created_at: string | null | undefined, maxCreated: Date | null): boolean {
  if (!maxCreated) return false;
  const c = parseDateLoose(created_at ?? null);
  if (!c) return false;
  const msPerDay = 86400000;
  return c.getTime() >= maxCreated.getTime() - 7 * msPerDay;
}

export function maxCreatedAtFromPrograms(programs: ProgramForRecommend[]): Date | null {
  let max: Date | null = null;
  for (const p of programs) {
    const c = parseDateLoose(p.created_at ?? null);
    if (!c) continue;
    if (!max || c.getTime() > max.getTime()) max = c;
  }
  return max;
}

export function computeRecommendScore(
  program: ProgramForRecommend,
  ctx: {
    appliedKeyword: string;
    appliedCategory: string;
    appliedSource: string;
    maxCreatedAt: Date | null;
  }
): RecommendResult {
  const reasons: string[] = [];
  let score = 0;

  const kw = ctx.appliedKeyword.trim();
  if (kw && keywordMatchesTitleOrList(kw, program.title, program.keywords ?? [])) {
    score += 30;
    const inTitle = (program.title ?? "").toLowerCase().includes(kw.toLowerCase());
    reasons.push(inTitle ? "선택 키워드와 사업명이 일치" : "선택 키워드와 등록 키워드가 일치");
  }

  const cat = ctx.appliedCategory.trim();
  if (cat && (program.category ?? "").trim() === cat) {
    score += 30;
    reasons.push(`${cat} 카테고리 일치`);
  }

  const src = ctx.appliedSource.trim();
  if (src && (program.source ?? "").trim() === src) {
    score += 10;
    reasons.push(`${src} 출처 일치`);
  }

  if (isReceptionOpen(program.start_date, program.end_date)) {
    score += 20;
    reasons.push("현재 접수 가능");
  }

  if (isRecentNotice(program.created_at, ctx.maxCreatedAt)) {
    score += 10;
    reasons.push("최근 등록 공고");
  }

  const tier: RecommendTier =
    score >= 70 ? "추천" : score >= 40 ? "검토" : "일반";

  return { score, reasons: reasons.slice(0, 4), tier };
}
