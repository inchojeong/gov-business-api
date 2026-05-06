import type { MonthlyRegistrationPoint } from "../components/support-dashboard-charts";
import type { ReceptionStatus } from "./recommendScore";

/** /support 표준 응답 + 하위 호환 별칭 */
export type SupportProgram = {
  id: number;
  title: string;
  category: string | null;
  source: string | null;
  organization: string | null;
  description: string | null;
  url: string | null;
  created_at: string | null;
  keywords?: string[] | null;
  target: string | null;
  scale: string | null;
  project_period: string | null;
  reception_start_date: string | null;
  reception_end_date: string | null;
  start_date: string | null;
  end_date: string | null;
  support_target?: string | null;
  support_scale?: string | null;
  manager_org?: string | null;
  agency?: string | null;
  task_period?: string | null;
  perform_period?: string | null;
  reception_status?: string | null;
  recommend_score?: number;
  matched_keywords?: string[];
  match_reason?: string | null;
};

export type SortOrderKey = "recommended" | "latest" | "oldest" | "title" | "source";

export type SupportListSummary = {
  open: number;
  recommend: number;
  recent7: number;
  by_category: Record<string, number>;
  by_source: Record<string, number>;
  by_reception_status?: Record<string, number>;
  by_month?: MonthlyRegistrationPoint[];
  max_created_at: string | null;
};

export type SyncStepPayload = {
  success: boolean;
  error: string | null;
  result: unknown;
};

export type SyncSupportsResponse = {
  all_success: boolean;
  gov_collect: SyncStepPayload;
  msit_collect: SyncStepPayload;
  process_keywords: SyncStepPayload;
};

export const SUPPORT_URL = "http://localhost:8000/support";
export const RECOMMEND_URL = "http://localhost:8000/recommend-programs";
export const PAGE_SIZE = 9;

export const RECEPTION_CHART_ORDER = ["접수중", "예정", "마감", "기간미상"] as const;

export const CATEGORY_OPTIONS = [
  { value: "", label: "전체" },
  { value: "R&D", label: "R&D" },
  { value: "수출", label: "수출" },
  { value: "창업", label: "창업" },
  { value: "기술개발", label: "기술개발" },
  { value: "사업화", label: "사업화" },
  { value: "금융", label: "금융" },
];

export const SOURCE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "GOV", label: "GOV" },
  { value: "MSIT", label: "MSIT" },
];

export const SORT_ORDER_OPTIONS: Array<{ value: SortOrderKey; label: string }> = [
  { value: "recommended", label: "추천순" },
  { value: "latest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "title", label: "제목순" },
  { value: "source", label: "출처순" },
];

export const RECEPTION_STATUS_OPTIONS: Array<{ value: ReceptionStatus | ""; label: string }> = [
  { value: "", label: "전체" },
  { value: "접수중", label: "접수중" },
  { value: "예정", label: "예정" },
  { value: "마감", label: "마감" },
  { value: "기간미상", label: "기간미상" },
];

export function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function normalizeSupportProgram(raw: Record<string, unknown>): SupportProgram {
  const start = strOrNull(raw.start_date ?? raw.reception_start_date);
  const end = strOrNull(raw.end_date ?? raw.reception_end_date);
  const target = strOrNull(raw.target ?? raw.support_target);
  const scale = strOrNull(raw.scale ?? raw.support_scale);
  const kws = raw.keywords;
  const keywords = Array.isArray(kws)
    ? kws.map((x) => String(x).trim()).filter(Boolean)
    : null;

  return {
    id: Number(raw.id),
    title: strOrNull(raw.title) ?? "",
    category: strOrNull(raw.category),
    source: strOrNull(raw.source),
    organization: strOrNull(raw.organization),
    description: strOrNull(raw.description),
    url: strOrNull(raw.url),
    created_at: strOrNull(raw.created_at),
    keywords: keywords ?? undefined,
    target,
    scale,
    project_period: strOrNull(raw.project_period),
    reception_start_date: start,
    reception_end_date: end,
    start_date: start,
    end_date: end,
    support_target: strOrNull(raw.support_target),
    support_scale: strOrNull(raw.support_scale),
    manager_org: strOrNull(raw.manager_org) ?? undefined,
    agency: strOrNull(raw.agency) ?? undefined,
    task_period: strOrNull(raw.task_period) ?? undefined,
    perform_period: strOrNull(raw.perform_period) ?? undefined,
  };
}

export function buildSupportListUrl(filters: {
  category: string;
  source: string;
  keyword: string;
  reception: string;
  page: number;
  size: number;
  sort: SortOrderKey;
}): string {
  const keyword = filters.keyword?.trim() || undefined;
  const category = filters.category?.trim() || undefined;
  const source = filters.source?.trim() || undefined;
  const reception = filters.reception?.trim() || undefined;
  const apiSort = filters.sort === "recommended" ? "latest" : filters.sort;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (source) params.set("source", source);
  if (keyword) params.set("keyword", keyword);
  if (reception) params.set("reception_status", reception);
  params.set("page", String(Math.max(1, filters.page)));
  params.set("size", String(Math.min(100, Math.max(1, filters.size))));
  params.set("sort", apiSort);
  return `${SUPPORT_URL}?${params.toString()}`;
}

export function parseSupportListResponse(raw: unknown): {
  items: SupportProgram[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  summary: SupportListSummary | null;
} {
  if (Array.isArray(raw)) {
    const items = raw
      .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
      .map((row) => normalizeSupportProgram(row));
    return {
      items,
      page: 1,
      size: items.length,
      total_count: items.length,
      total_pages: items.length > 0 ? 1 : 0,
      summary: null,
    };
  }
  if (!raw || typeof raw !== "object") {
    return { items: [], page: 1, size: PAGE_SIZE, total_count: 0, total_pages: 0, summary: null };
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
        .map((row) => normalizeSupportProgram(row))
    : [];
  const summaryRaw = o.summary;
  let summary: SupportListSummary | null = null;
  if (summaryRaw && typeof summaryRaw === "object") {
    const s = summaryRaw as Record<string, unknown>;
    const byCat = s.by_category;
    const bySrc = s.by_source;
    const byRecv = s.by_reception_status;
    const byMonthRaw = s.by_month;
    let byMonth: MonthlyRegistrationPoint[] | undefined;
    if (Array.isArray(byMonthRaw)) {
      byMonth = byMonthRaw
        .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
        .map((x) => ({
          month: String(x.month ?? x.label ?? "").trim(),
          count: Number(x.count ?? x.value) || 0,
        }))
        .filter((x) => x.month.length > 0);
      if (byMonth.length === 0) byMonth = undefined;
    }
    summary = {
      open: Number(s.open) || 0,
      recommend: Number(s.recommend) || 0,
      recent7: Number(s.recent7) || 0,
      by_category:
        byCat && typeof byCat === "object" && !Array.isArray(byCat)
          ? Object.fromEntries(
              Object.entries(byCat as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0])
            )
          : {},
      by_source:
        bySrc && typeof bySrc === "object" && !Array.isArray(bySrc)
          ? Object.fromEntries(
              Object.entries(bySrc as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0])
            )
          : {},
      by_reception_status:
        byRecv && typeof byRecv === "object" && !Array.isArray(byRecv)
          ? Object.fromEntries(
              Object.entries(byRecv as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0])
            )
          : undefined,
      by_month: byMonth,
      max_created_at: strOrNull(s.max_created_at),
    };
  }
  return {
    items,
    page: Number(o.page) || 1,
    size: Number(o.size) || PAGE_SIZE,
    total_count: Number(o.total_count) || 0,
    total_pages: Number(o.total_pages) || 0,
    summary,
  };
}

export function normalizeRecommendProgram(raw: Record<string, unknown>): SupportProgram {
  const matchedRaw = raw.matched_keywords;
  const matched = Array.isArray(matchedRaw)
    ? matchedRaw.map((x) => String(x).trim()).filter(Boolean)
    : [];
  return {
    id: Number(raw.id),
    title: strOrNull(raw.title) ?? "",
    category: strOrNull(raw.category),
    source: strOrNull(raw.source),
    organization: null,
    description: null,
    url: null,
    created_at: null,
    keywords: undefined,
    target: null,
    scale: null,
    project_period: null,
    reception_start_date: null,
    reception_end_date: null,
    start_date: null,
    end_date: null,
    support_target: null,
    support_scale: null,
    manager_org: undefined,
    agency: undefined,
    task_period: undefined,
    perform_period: undefined,
    reception_status: strOrNull(raw.reception_status),
    recommend_score: Number(raw.recommend_score) || 0,
    matched_keywords: matched,
    match_reason: strOrNull(raw.match_reason),
  };
}

export async function fetchRecommendedPrograms(params: {
  keywords: string;
  category?: string;
  limit?: number;
}): Promise<SupportProgram[]> {
  const kw = params.keywords.trim();
  if (!kw) return [];
  const qs = new URLSearchParams();
  qs.set("keywords", kw);
  qs.set("limit", String(Math.min(100, Math.max(1, params.limit ?? 20))));
  const category = params.category?.trim();
  if (category) qs.set("category", category);

  const res = await fetch(`${RECOMMEND_URL}?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`추천 조회 실패 (${res.status})`);
  }
  const body: unknown = await res.json();
  const itemsRaw =
    body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).items)
      ? ((body as Record<string, unknown>).items as unknown[])
      : [];
  return itemsRaw
    .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
    .map((row) => normalizeRecommendProgram(row));
}

/** /sync-supports 각 단계 result에 포함될 수 있는 집계 필드 */
type SyncStepResultStats = {
  fetched_count?: number;
  inserted_count?: number;
  skipped_count?: number;
  updated_count?: number;
  error_count?: number;
  saved_count?: number;
  processed_count?: number;
  keyword_count?: number;
  failed_pages?: unknown[];
  message?: string;
};

function asSyncResultStats(res: unknown): SyncStepResultStats | null {
  if (!res || typeof res !== "object" || Array.isArray(res)) return null;
  return res as SyncStepResultStats;
}

function nOrUndef(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const x = Number(v);
    return Number.isNaN(x) ? undefined : x;
  }
  return undefined;
}

export function formatSyncStepDetail(
  step: SyncStepPayload | undefined,
  stepKey: "gov" | "msit" | "keywords"
): string | null {
  if (!step?.success) return null;
  const r = asSyncResultStats(step.result);
  if (!r) return null;
  const parts: string[] = [];
  const fetched = nOrUndef(r.fetched_count) ?? (stepKey === "keywords" ? nOrUndef(r.processed_count) : undefined);
  const inserted = nOrUndef(r.inserted_count) ?? nOrUndef(r.saved_count);
  const skipped = nOrUndef(r.skipped_count);
  const updated = nOrUndef(r.updated_count);
  const errors = nOrUndef(r.error_count);
  const kwRows = nOrUndef(r.keyword_count);

  if (fetched != null) {
    parts.push(stepKey === "keywords" ? `대상 공고 ${fetched}건` : `API 응답 ${fetched}건`);
  }
  if (stepKey !== "keywords" && inserted != null) {
    parts.push(`신규 저장 ${inserted}건`);
  } else if (stepKey === "keywords" && inserted != null && inserted > 0) {
    parts.push(`신규 키워드 행 ${inserted}건`);
  }
  if (skipped != null && skipped > 0) {
    parts.push(stepKey === "keywords" ? `키워드 미추출 공고 ${skipped}건` : `중복·제외 ${skipped}건`);
  }
  if (updated != null && updated > 0) {
    parts.push(`키워드 갱신 ${updated}건`);
  }
  if (kwRows != null && kwRows > 0 && stepKey === "keywords") {
    parts.push(`키워드 연결 ${kwRows}건`);
  }
  if (errors != null && errors > 0 && !(r.failed_pages && Array.isArray(r.failed_pages) && r.failed_pages.length > 0)) {
    parts.push(`페이지·구간 오류 ${errors}건`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatSyncStepWarning(step: SyncStepPayload | undefined): string | null {
  const r = asSyncResultStats(step?.result);
  if (!r?.failed_pages || !Array.isArray(r.failed_pages) || r.failed_pages.length === 0) return null;
  return `일부 페이지 응답 실패 ${r.failed_pages.length}건 (상세는 서버 로그)`;
}

export function sourceBadgeClasses(source: string): string {
  const s = source.trim().toUpperCase();
  if (s === "GOV") return "border-sky-500/35 bg-sky-500/10 text-sky-200";
  if (s === "MSIT") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
  return "border-white/10 bg-white/[0.06] text-zinc-300";
}

export function receptionBadgeClasses(status: ReceptionStatus): string {
  if (status === "접수중") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
  if (status === "예정") return "border-white/10 bg-white/[0.06] text-zinc-200";
  if (status === "마감") return "border-white/10 bg-zinc-800/80 text-zinc-400";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

export function tierBadgeClasses(tier: string): string {
  if (tier === "추천") return "border-white/15 bg-white/10 text-zinc-100";
  if (tier === "검토") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/[0.04] text-zinc-400";
}

export const MISSING = "미제공";

export function fmtText(v: string | null | undefined): string {
  return v != null && String(v).trim() !== "" ? String(v).trim() : MISSING;
}

export function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  const found = values.find((v) => v != null && String(v).trim() !== "");
  return found ?? null;
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function countRegisteredLast7Days(programs: SupportProgram[]): number {
  const today = startOfDayLocal(new Date());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 7);
  let n = 0;
  for (const p of programs) {
    if (!p.created_at) continue;
    const s = String(p.created_at).trim().replace(/\./g, "-");
    const c = new Date(s);
    if (Number.isNaN(c.getTime())) continue;
    const cd = startOfDayLocal(c);
    if (cd >= cutoff) n += 1;
  }
  return n;
}
