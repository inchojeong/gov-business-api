"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeRecommendScore,
  getReceptionStatus,
  maxCreatedAtFromPrograms,
  type ReceptionStatus,
} from "../lib/recommendScore";
import { DashboardChartsRow, type ChartBarItem } from "../components/support-dashboard-charts";

/** /support 표준 응답 + 하위 호환 별칭 */
type SupportProgram = {
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
  /** 추천·접수상태 계산용 (reception_* 와 동일 값) */
  start_date: string | null;
  end_date: string | null;
  support_target?: string | null;
  support_scale?: string | null;
  manager_org?: string | null;
  agency?: string | null;
  task_period?: string | null;
  perform_period?: string | null;
};

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeSupportProgram(raw: Record<string, unknown>): SupportProgram {
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

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function countRegisteredLast7Days(programs: SupportProgram[]): number {
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

const SUPPORT_URL = "http://localhost:8000/support";
const PAGE_SIZE = 9;

const CATEGORY_OPTIONS = [
  { value: "", label: "전체" },
  { value: "R&D", label: "R&D" },
  { value: "수출", label: "수출" },
  { value: "창업", label: "창업" },
  { value: "기술개발", label: "기술개발" },
  { value: "사업화", label: "사업화" },
  { value: "금융", label: "금융" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "GOV", label: "GOV" },
  { value: "MSIT", label: "MSIT" },
];

const RECEPTION_STATUS_OPTIONS: Array<{ value: ReceptionStatus | ""; label: string }> = [
  { value: "", label: "전체" },
  { value: "접수중", label: "접수중" },
  { value: "예정", label: "예정" },
  { value: "마감", label: "마감" },
  { value: "기간미상", label: "기간미상" },
];

function buildSupportListUrl(filters: {
  category: string;
  source: string;
  keyword: string;
}): string {
  const keyword = filters.keyword?.trim() || undefined;
  const category = filters.category?.trim() || undefined;
  const source = filters.source?.trim() || undefined;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (source) params.set("source", source);
  if (keyword) params.set("keyword", keyword);
  const q = params.toString();
  return q ? `${SUPPORT_URL}?${q}` : SUPPORT_URL;
}

function sourceBadgeClasses(source: string): string {
  const s = source.trim().toUpperCase();
  if (s === "GOV") return "border-sky-200/70 bg-sky-50/80 text-sky-900";
  if (s === "MSIT") return "border-emerald-200/70 bg-emerald-50/80 text-emerald-900";
  return "border-slate-200 bg-slate-100/90 text-slate-700";
}

function receptionBadgeClasses(status: ReceptionStatus): string {
  if (status === "접수중") return "border-emerald-200/80 bg-emerald-50/80 text-emerald-900";
  if (status === "예정") return "border-slate-200 bg-slate-100/90 text-slate-800";
  if (status === "마감") return "border-slate-200 bg-slate-200/50 text-slate-700";
  return "border-amber-200/80 bg-amber-50/80 text-amber-900";
}

function tierBadgeClasses(tier: string): string {
  if (tier === "추천") return "border-slate-300 bg-slate-200/60 text-slate-900";
  if (tier === "검토") return "border-amber-200/70 bg-amber-50/90 text-amber-900";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

type SyncStepPayload = {
  success: boolean;
  error: string | null;
  result: unknown;
};

type SyncSupportsResponse = {
  all_success: boolean;
  gov_collect: SyncStepPayload;
  msit_collect: SyncStepPayload;
  process_keywords: SyncStepPayload;
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white/60 px-3 text-sm text-slate-900 shadow-sm outline-none backdrop-blur-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/80";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-600";

export default function Home() {
  const [data, setData] = useState<SupportProgram[]>([]);
  const [page, setPage] = useState(1);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterReceptionStatus, setFilterReceptionStatus] = useState<ReceptionStatus | "">("");

  const [appliedCategory, setAppliedCategory] = useState("");
  const [appliedSource, setAppliedSource] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncSupportsResponse | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<SupportProgram | null>(null);

  const loadSupportList = useCallback(
    async (filters?: { category: string; source: string; keyword: string }) => {
      setListLoading(true);
      setListError(null);
      const url = filters
        ? buildSupportListUrl(filters)
        : SUPPORT_URL;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`목록 조회 실패 (${res.status})`);
        }
        const result: unknown = await res.json();
        setData(
          Array.isArray(result)
            ? result
                .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
                .map((row) => normalizeSupportProgram(row))
            : []
        );
      } catch (e) {
        setListError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
        setData([]);
      } finally {
        setListLoading(false);
      }
    },
    []
  );

  const handleSearch = () => {
    setPage(1);
    const cat = filterCategory.trim();
    const src = filterSource.trim();
    const kw = filterKeyword.trim();
    setAppliedCategory(cat);
    setAppliedSource(src);
    setAppliedKeyword(kw);
    void loadSupportList({
      category: filterCategory,
      source: filterSource,
      keyword: filterKeyword,
    });
  };

  const handleReset = () => {
    setFilterCategory("");
    setFilterSource("");
    setFilterKeyword("");
    setFilterReceptionStatus("");
    setAppliedCategory("");
    setAppliedSource("");
    setAppliedKeyword("");
    setPage(1);
    void loadSupportList({
      category: "",
      source: "",
      keyword: "",
    });
  };

  const syncSupports = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await fetch("http://localhost:8000/sync-supports", {
        method: "POST",
      });
      const body = (await res.json()) as SyncSupportsResponse;

      if (!res.ok) {
        throw new Error(`동기화 요청 실패 (${res.status})`);
      }

      setLastSync(body);

      if (!body.all_success) {
        const stepLabels: Record<keyof Omit<SyncSupportsResponse, "all_success">, string> = {
          gov_collect: "GOV 수집",
          msit_collect: "MSIT 수집",
          process_keywords: "키워드 처리",
        };
        const failed = (
          ["gov_collect", "msit_collect", "process_keywords"] as const
        )
          .filter((key) => !body[key].success)
          .map((key) => {
            const err = body[key].error;
            return `${stepLabels[key]}${err ? `: ${err}` : " 실패"}`;
          });
        setSyncMessage(failed.length ? failed.join(" · ") : "동기화 중 일부 단계가 실패했습니다.");
      } else {
        setSyncMessage(null);
      }

      await loadSupportList({
        category: appliedCategory,
        source: appliedSource,
        keyword: appliedKeyword,
      });
    } catch (e) {
      setLastSync(null);
      setSyncMessage(e instanceof Error ? e.message : "동기화에 실패했습니다.");
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    void loadSupportList();
  }, [loadSupportList]);

  const maxCreatedAt = useMemo(() => maxCreatedAtFromPrograms(data), [data]);

  const filteredData = useMemo(() => {
    if (!filterReceptionStatus) return data;
    return data.filter(
      (item) => getReceptionStatus(item.start_date, item.end_date) === filterReceptionStatus
    );
  }, [data, filterReceptionStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const p = Math.min(page, Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE) || 1));
    const start = (p - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  const kpiMetrics = useMemo(() => {
    const ctx = {
      appliedKeyword,
      appliedCategory,
      appliedSource,
      maxCreatedAt,
    };
    let open = 0;
    let recommend = 0;
    for (const p of data) {
      if (getReceptionStatus(p.start_date, p.end_date) === "접수중") open += 1;
      if (computeRecommendScore(p, ctx).tier === "추천") recommend += 1;
    }
    return {
      total: data.length,
      open,
      recommend,
      recent7: countRegisteredLast7Days(data),
    };
  }, [data, appliedKeyword, appliedCategory, appliedSource, maxCreatedAt]);

  const chartCategoryItems = useMemo((): ChartBarItem[] => {
    const map = new Map<string, number>();
    for (const p of data) {
      const key = p.category && p.category.trim() ? p.category.trim() : "미분류";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([label, value]) => ({ label, value, max }));
  }, [data]);

  const chartSourceItems = useMemo((): ChartBarItem[] => {
    const map = new Map<string, number>();
    for (const p of data) {
      const key = p.source && p.source.trim() ? p.source.trim().toUpperCase() : "기타";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const order = ["GOV", "MSIT", "기타"];
    const entries = [...map.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return b[1] - a[1];
    });
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([label, value]) => ({ label, value, max }));
  }, [data]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const closeDetailPanel = useCallback(() => {
    setSelectedProgram(null);
  }, []);

  useEffect(() => {
    if (!selectedProgram) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProgram(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedProgram]);

  const MISSING = "미제공";

  const fmtText = (v: string | null | undefined) =>
    v != null && String(v).trim() !== "" ? String(v).trim() : MISSING;

  const fmtReceptionLine = (start: string | null | undefined, end: string | null | undefined) => {
    if (getReceptionStatus(start, end) === "기간미상") return "기간미상";
    return `${fmtText(start)} ~ ${fmtText(end)}`;
  };

  const firstNonEmpty = (values: Array<string | null | undefined>) => {
    const found = values.find((v) => v != null && String(v).trim() !== "");
    return found ?? null;
  };

  const selectedRec = useMemo(() => {
    if (!selectedProgram) return null;
    return computeRecommendScore(selectedProgram, {
      appliedKeyword: appliedKeyword,
      appliedCategory: appliedCategory,
      appliedSource: appliedSource,
      maxCreatedAt,
    });
  }, [selectedProgram, appliedKeyword, appliedCategory, appliedSource, maxCreatedAt]);

  const stepRow = (
    label: string,
    step: SyncStepPayload | undefined,
    showPlaceholder: boolean
  ) => {
    if (!step && !showPlaceholder) return null;
    const ok = step?.success === true;
    const err = step?.error;
    const box =
      step == null
        ? "border-slate-200 bg-slate-50/80 text-slate-500 backdrop-blur-sm"
        : ok
          ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900 backdrop-blur-sm"
          : "border-red-200/80 bg-red-50/80 text-red-900 backdrop-blur-sm";
    return (
      <div
        key={label}
        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${box}`}
      >
        <span className="font-semibold text-slate-900">{label}</span>
        <span className="shrink-0 text-right text-sm">
          {!step && showPlaceholder ? "—" : ok ? "성공" : `실패${err ? `: ${err}` : ""}`}
        </span>
      </div>
    );
  };

  const badgeBase =
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold";

  const kpiCardClass =
    "rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm";

  return (
    <main className="min-h-screen bg-slate-50 py-8 text-slate-900 antialiased sm:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-6 sm:mb-8">
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Support programs
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                  정부지원사업 통합 조회
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  정부·과기정통부 지원사업을 수집하고 추천 기준에 따라 검토합니다.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:items-end">
                <button
                  type="button"
                  onClick={() => void syncSupports()}
                  disabled={syncLoading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                >
                  {syncLoading ? "동기화 중…" : "전체 데이터 동기화"}
                </button>
                <p className="text-xs text-slate-600 lg:text-right">
                  GOV → MSIT 수집 후 키워드 처리까지 순차 실행됩니다.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <h2 className="sr-only">데이터 동기화 결과</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {stepRow("GOV 수집", lastSync?.gov_collect, !!lastSync)}
            {stepRow("MSIT 수집", lastSync?.msit_collect, !!lastSync)}
            {stepRow("키워드 처리", lastSync?.process_keywords, !!lastSync)}
          </div>

          {!lastSync && !syncLoading && (
            <p className="mt-3 text-sm text-slate-500">동기화를 실행하면 단계별 결과가 여기에 표시됩니다.</p>
          )}

          {lastSync?.all_success && !syncMessage && !syncLoading && (
            <p className="mt-3 text-sm font-medium text-emerald-800/90" role="status">
              모든 단계가 성공적으로 완료되었습니다.
            </p>
          )}

          {syncMessage && (
            <p className="mt-3 text-sm font-medium text-red-700" role="alert">
              {syncMessage}
            </p>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="요약 지표">
          <div className={kpiCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">전체 공고</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {listLoading ? "…" : kpiMetrics.total}
            </p>
          </div>
          <div className={kpiCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">접수중</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-800/90">
              {listLoading ? "…" : kpiMetrics.open}
            </p>
          </div>
          <div className={kpiCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">추천 공고</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-amber-800/90">
              {listLoading ? "…" : kpiMetrics.recommend}
            </p>
          </div>
          <div className={kpiCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">최근 7일 등록</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">
              {listLoading ? "…" : kpiMetrics.recent7}
            </p>
          </div>
        </section>

        <section className="mb-8" aria-label="분포 차트 영역">
          <DashboardChartsRow categoryItems={chartCategoryItems} sourceItems={chartSourceItems} />
        </section>

        <section className="mb-8 rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">검색 및 필터</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                서버 검색은 키워드·카테고리·출처이며, 접수상태는 목록 로드 후 클라이언트에서 적용됩니다.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <span className={labelClass}>키워드</span>
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => {
                  setFilterKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="사업명·등록 키워드 검색"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>카테고리</span>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.label + opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>출처</span>
              <select
                value={filterSource}
                onChange={(e) => {
                  setFilterSource(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.label + opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>접수상태</span>
              <select
                value={filterReceptionStatus}
                onChange={(e) => {
                  setFilterReceptionStatus(e.target.value as ReceptionStatus | "");
                  setPage(1);
                }}
                className={inputClass}
              >
                {RECEPTION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.label + opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end lg:col-span-4">
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={listLoading}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 sm:flex-none sm:min-w-[104px]"
              >
                검색
              </button>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={listLoading}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white/60 px-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-slate-50/90 disabled:cursor-wait disabled:opacity-70 sm:flex-none sm:min-w-[104px]"
              >
                초기화
              </button>
            </div>
          </div>
        </section>

        {listError && (
          <div
            className="mb-6 rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-sm backdrop-blur-sm"
            role="alert"
          >
            {listError}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600 sm:text-base">
            총{" "}
            <strong className="font-semibold text-slate-900">{listLoading ? "…" : filteredData.length}</strong>
            건
            {!listLoading && filteredData.length > 0 && (
              <span className="ml-2 font-normal text-slate-500">
                (페이지 {safePage} / {totalPages})
              </span>
            )}
          </p>
        </div>

        {listLoading ? (
          <div
            className="rounded-xl border border-dashed border-slate-200/90 bg-white/70 px-6 py-16 text-center text-slate-600 shadow-sm backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium">목록을 불러오는 중입니다…</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white/70 px-6 py-16 text-center shadow-sm backdrop-blur-sm">
            <p className="text-sm text-slate-600">
              조건에 맞는 공고가 없습니다. 필터를 바꾸거나 동기화를 실행해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
            {pageSlice.map((item) => {
              const rec = computeRecommendScore(item, {
                appliedKeyword: appliedKeyword,
                appliedCategory: appliedCategory,
                appliedSource: appliedSource,
                maxCreatedAt,
              });
              const desc =
                item.description != null && String(item.description).trim() !== ""
                  ? String(item.description).trim()
                  : null;
              const receptionStatus = getReceptionStatus(item.start_date, item.end_date);

              return (
                <article
                  key={item.id}
                  onClick={() => setSelectedProgram(item)}
                  className="flex cursor-pointer flex-col rounded-lg border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 line-clamp-2 text-lg font-semibold leading-snug text-slate-900">
                      {fmtText(item.title)}
                    </h3>
                    <span className={`${badgeBase} shrink-0 ${tierBadgeClasses(rec.tier)}`}>
                      {rec.tier} · {rec.score}점
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`${badgeBase} ${sourceBadgeClasses(fmtText(item.source))}`}>
                      {fmtText(item.source)}
                    </span>
                    <span className={`${badgeBase} border-slate-200 bg-slate-100/90 text-slate-800`}>
                      {fmtText(item.category)}
                    </span>
                    <span className={`${badgeBase} ${receptionBadgeClasses(receptionStatus)}`}>
                      {receptionStatus}
                    </span>
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                    {desc ?? MISSING}
                  </p>

                  <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-3 text-sm text-slate-700">
                    <p>
                      <span className="text-slate-500">지원대상·주관</span>{" "}
                      <span className="font-medium text-slate-800">
                        {fmtText(firstNonEmpty([item.target, item.organization]))}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">접수기간</span>{" "}
                      <span className="font-medium text-slate-800">{fmtReceptionLine(item.start_date, item.end_date)}</span>
                    </p>
                  </div>

                  {rec.reasons.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-slate-700">추천 요인: {rec.reasons.join(" · ")}</p>
                  )}

                  <div className="mt-auto flex flex-col gap-2 border-t border-slate-200/60 pt-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProgram(item);
                      }}
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white/60 px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-slate-50/90"
                    >
                      상세보기
                    </button>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        원문 보기
                      </a>
                    ) : (
                      <span className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-500">
                        {MISSING}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!listLoading && filteredData.length > 0 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            aria-label="페이지 이동"
          >
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-slate-50/90 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <span className="min-w-[4rem] text-center text-sm text-slate-600">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-slate-50/90 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </button>
          </nav>
        )}

        {selectedProgram && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="공고 상세"
            onClick={closeDetailPanel}
            className="fixed inset-0 z-[1000] flex justify-end bg-slate-900/35 backdrop-blur-sm"
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-[min(560px,100vw)] flex-col gap-4 overflow-y-auto border-l border-slate-200/90 bg-slate-100/95 p-5 shadow-xl backdrop-blur-sm sm:p-6"
            >
              <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-5 sm:py-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">공고 상세</h2>
                <button
                  type="button"
                  onClick={closeDetailPanel}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-slate-50/90"
                >
                  닫기
                </button>
              </div>

              {(() => {
                const status = getReceptionStatus(selectedProgram.start_date, selectedProgram.end_date);
                const rec = selectedRec;
                const kwList =
                  selectedProgram.keywords && selectedProgram.keywords.length > 0
                    ? selectedProgram.keywords
                    : [];
                return (
                  <>
                    <div className="rounded-lg border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">추천 점수</p>
                          <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">{rec?.score ?? 0}</p>
                          <p className="mt-0.5 text-sm text-slate-600">100점 만점 기준 누적</p>
                        </div>
                        <span className={`${badgeBase} ${tierBadgeClasses(rec?.tier ?? "일반")}`}>
                          {rec?.tier ?? "일반"}
                        </span>
                      </div>
                      <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-100/70 px-4 py-3 backdrop-blur-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">추천 사유</p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-900">
                          {rec && rec.reasons.length > 0 ? rec.reasons.join(" · ") : MISSING}
                        </p>
                      </div>
                      <p className="mt-4 text-base font-semibold leading-snug text-slate-900">{fmtText(selectedProgram.title)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`${badgeBase} ${sourceBadgeClasses(fmtText(selectedProgram.source))}`}>
                          {fmtText(selectedProgram.source)}
                        </span>
                        <span className={`${badgeBase} border-slate-200 bg-slate-100/90 text-slate-800`}>
                          {fmtText(selectedProgram.category)}
                        </span>
                        <span className={`${badgeBase} ${receptionBadgeClasses(status)}`}>{status}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">등록 키워드</h3>
                      {kwList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {kwList.map((k, i) => (
                            <span
                              key={`${k}-${i}`}
                              className="inline-flex rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">{MISSING}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">주요 정보</h3>
                      <dl className="space-y-3 text-sm text-slate-800">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="shrink-0 text-slate-600 sm:w-28">지원대상</dt>
                          <dd className="min-w-0 font-medium">
                            {fmtText(
                              firstNonEmpty([
                                selectedProgram.target,
                                selectedProgram.support_target,
                                selectedProgram.organization,
                              ])
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="shrink-0 text-slate-600 sm:w-28">지원규모</dt>
                          <dd className="min-w-0 font-medium">
                            {fmtText(firstNonEmpty([selectedProgram.scale, selectedProgram.support_scale]))}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="shrink-0 text-slate-600 sm:w-28">접수기간</dt>
                          <dd className="min-w-0 font-medium">
                            {fmtReceptionLine(selectedProgram.start_date, selectedProgram.end_date)}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="shrink-0 text-slate-600 sm:w-28">과제수행기간</dt>
                          <dd className="min-w-0 font-medium">
                            {fmtText(
                              firstNonEmpty([
                                selectedProgram.project_period,
                                selectedProgram.task_period,
                                selectedProgram.perform_period,
                              ])
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="shrink-0 text-slate-600 sm:w-28">주관/담당기관</dt>
                          <dd className="min-w-0 font-medium">
                            {fmtText(
                              firstNonEmpty([
                                selectedProgram.organization,
                                selectedProgram.manager_org,
                                selectedProgram.agency,
                              ])
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">지원내용 전체</h3>
                      <p className="text-sm font-medium leading-relaxed text-slate-900">{fmtText(selectedProgram.description)}</p>
                    </div>
                  </>
                );
              })()}

              {selectedProgram.url ? (
                <a
                  href={selectedProgram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  공고 원문 링크
                </a>
              ) : (
                <span className="text-center text-sm text-slate-500">{MISSING}</span>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
