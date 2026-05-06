"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeRecommendScore,
  getReceptionStatus,
  maxCreatedAtFromPrograms,
  type ReceptionStatus,
} from "../../lib/recommendScore";
import {
  DashboardChartsRow,
  type ChartBarItem,
  type ChartPieSegment,
} from "../../components/support-dashboard-charts";
import {
  PAGE_SIZE,
  RECEPTION_CHART_ORDER,
  buildSupportListUrl,
  countRegisteredLast7Days,
  fmtText,
  parseSupportListResponse,
  type SortOrderKey,
  type SupportListSummary,
  type SupportProgram,
  type SyncSupportsResponse,
} from "../../lib/dashboard-shared";
import { Header } from "../../components/dashboard/Header";
import { ProgramCard } from "../../components/dashboard/ProgramCard";
import { ProgramDetailPanel } from "../../components/dashboard/ProgramDetailPanel";
import { SyncStepRow } from "../../components/dashboard/SyncStepRow";
import { cardSurface, btnSecondary } from "../../components/dashboard/ui-classes";
import { PlatformPageFrame } from "../../components/layout/PlatformPageFrame";

export default function Home() {
  const [data, setData] = useState<SupportProgram[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [listSummary, setListSummary] = useState<SupportListSummary | null>(null);
  const [listVersion, setListVersion] = useState(0);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterReceptionStatus, setFilterReceptionStatus] = useState<ReceptionStatus | "">("");
  const [sortOrder, setSortOrder] = useState<SortOrderKey>("recommended");

  const [appliedCategory, setAppliedCategory] = useState("");
  const [appliedSource, setAppliedSource] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncSupportsResponse | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<SupportProgram | null>(null);

  const fetchPrograms = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const url = buildSupportListUrl({
      category: appliedCategory,
      source: appliedSource,
      keyword: appliedKeyword,
      reception: filterReceptionStatus,
      page,
      size: PAGE_SIZE,
      sort: sortOrder,
    });
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`목록 조회 실패 (${res.status})`);
      }
      const result: unknown = await res.json();
      const parsed = parseSupportListResponse(result);
      setTotalCount(parsed.total_count);
      setTotalPages(parsed.total_pages);
      setListSummary(parsed.summary);

      let items = parsed.items;
      if (sortOrder === "recommended") {
        const maxFromSummary =
          parsed.summary?.max_created_at != null && String(parsed.summary.max_created_at).trim() !== ""
            ? new Date(String(parsed.summary.max_created_at).trim().replace(/\./g, "-"))
            : null;
        const maxCreatedAt =
          maxFromSummary && !Number.isNaN(maxFromSummary.getTime())
            ? maxFromSummary
            : maxCreatedAtFromPrograms(items);
        const ctx = {
          appliedKeyword: appliedKeyword,
          appliedCategory: appliedCategory,
          appliedSource: appliedSource,
          maxCreatedAt,
        };
        items = [...items].sort(
          (a, b) => computeRecommendScore(b, ctx).score - computeRecommendScore(a, ctx).score
        );
      }
      setData(items);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
      setData([]);
      setTotalCount(0);
      setTotalPages(0);
      setListSummary(null);
    } finally {
      setListLoading(false);
    }
  }, [
    appliedCategory,
    appliedSource,
    appliedKeyword,
    filterReceptionStatus,
    page,
    sortOrder,
    listVersion,
  ]);

  useEffect(() => {
    void fetchPrograms();
  }, [fetchPrograms]);

  const handleSearch = () => {
    setPage(1);
    const cat = filterCategory.trim();
    const src = filterSource.trim();
    const kw = filterKeyword.trim();
    setAppliedCategory(cat);
    setAppliedSource(src);
    setAppliedKeyword(kw);
    setListVersion((v) => v + 1);
  };

  const handleReset = () => {
    setFilterCategory("");
    setFilterSource("");
    setFilterKeyword("");
    setFilterReceptionStatus("");
    setSortOrder("recommended");
    setAppliedCategory("");
    setAppliedSource("");
    setAppliedKeyword("");
    setPage(1);
    setListVersion((v) => v + 1);
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
        const failed = (["gov_collect", "msit_collect", "process_keywords"] as const)
          .filter((key) => !body[key].success)
          .map((key) => {
            const err = body[key].error;
            return `${stepLabels[key]}${err ? `: ${err}` : " 실패"}`;
          });
        setSyncMessage(failed.length ? failed.join(" · ") : "동기화 중 일부 단계가 실패했습니다.");
      } else {
        setSyncMessage(null);
      }

      setPage(1);
      setListVersion((v) => v + 1);
    } catch (e) {
      setLastSync(null);
      setSyncMessage(e instanceof Error ? e.message : "동기화에 실패했습니다.");
    } finally {
      setSyncLoading(false);
    }
  };

  const maxCreatedAt = useMemo(() => {
    if (listSummary?.max_created_at != null && String(listSummary.max_created_at).trim() !== "") {
      const d = new Date(String(listSummary.max_created_at).trim().replace(/\./g, "-"));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return maxCreatedAtFromPrograms(data);
  }, [listSummary, data]);

  const displayTotalPages = totalCount > 0 ? Math.max(1, totalPages) : 0;
  const safePage = displayTotalPages > 0 ? Math.min(page, displayTotalPages) : 1;

  const kpiMetrics = useMemo(() => {
    if (listSummary) {
      return {
        total: totalCount,
        open: listSummary.open,
        recommend: listSummary.recommend,
        recent7: listSummary.recent7,
      };
    }
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
  }, [listSummary, totalCount, data, appliedKeyword, appliedCategory, appliedSource, maxCreatedAt]);

  const chartCategoryItems = useMemo((): ChartBarItem[] => {
    if (listSummary?.by_category && Object.keys(listSummary.by_category).length > 0) {
      const entries = Object.entries(listSummary.by_category).sort((a, b) => b[1] - a[1]);
      const max = Math.max(1, ...entries.map(([, v]) => v));
      return entries.map(([label, value]) => ({ label, value, max }));
    }
    const map = new Map<string, number>();
    for (const p of data) {
      const key = p.category && p.category.trim() ? p.category.trim() : "미분류";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([label, value]) => ({ label, value, max }));
  }, [listSummary, data]);

  const chartSourceItems = useMemo((): ChartBarItem[] => {
    if (listSummary?.by_source && Object.keys(listSummary.by_source).length > 0) {
      const order = ["GOV", "MSIT", "기타"];
      const entries = Object.entries(listSummary.by_source).sort((a, b) => {
        const ia = order.indexOf(a[0]);
        const ib = order.indexOf(b[0]);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return b[1] - a[1];
      });
      const max = Math.max(1, ...entries.map(([, v]) => v));
      return entries.map(([label, value]) => ({ label, value, max }));
    }
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
  }, [listSummary, data]);

  const chartReceptionSegments = useMemo((): ChartPieSegment[] => {
    const fromSummary = listSummary?.by_reception_status;
    if (fromSummary && Object.keys(fromSummary).length > 0) {
      return RECEPTION_CHART_ORDER.map((name) => ({
        name,
        value: fromSummary[name] ?? 0,
      }));
    }
    const map = new Map<string, number>();
    for (const p of data) {
      const st = getReceptionStatus(p.start_date, p.end_date);
      map.set(st, (map.get(st) ?? 0) + 1);
    }
    return RECEPTION_CHART_ORDER.map((name) => ({
      name,
      value: map.get(name) ?? 0,
    }));
  }, [listSummary, data]);

  useEffect(() => {
    if (displayTotalPages > 0 && page > displayTotalPages) setPage(displayTotalPages);
  }, [page, displayTotalPages]);

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

  const fmtReceptionLine = (start: string | null | undefined, end: string | null | undefined) => {
    if (getReceptionStatus(start, end) === "기간미상") return "기간미상";
    return `${fmtText(start)} ~ ${fmtText(end)}`;
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

  const kpiCardClass = `${cardSurface} p-5 transition hover:border-white/[0.12]`;

  return (
    <PlatformPageFrame
      exploreTools={{
        filterCategory,
        filterSource,
        filterReceptionStatus,
        sortOrder,
        onFilterCategory: (v) => {
          setFilterCategory(v);
          setPage(1);
        },
        onFilterSource: (v) => {
          setFilterSource(v);
          setPage(1);
        },
        onFilterReception: (v) => {
          setFilterReceptionStatus(v);
          setPage(1);
        },
        onSortOrder: (v) => {
          setSortOrder(v);
          setPage(1);
        },
      }}
    >
      <Header
        filterKeyword={filterKeyword}
        onKeywordChange={(v) => {
          setFilterKeyword(v);
          setPage(1);
        }}
        onSearch={handleSearch}
        onReset={handleReset}
        onSync={() => void syncSupports()}
        syncLoading={syncLoading}
        listLoading={listLoading}
      />

      <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div id="section-overview" className="mb-6 scroll-mt-24 space-y-6">
          <div className={`${cardSurface} p-6 sm:p-8`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Support programs</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl lg:text-4xl">
              정부지원사업 통합 조회
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              정부·과기정통부 지원사업을 수집하고 추천 기준에 따라 검토합니다. 상단에서 검색·동기화할 수 있습니다.
            </p>
          </div>

          <section className={`${cardSurface} p-4 sm:p-5`}>
            <h2 className="sr-only">데이터 동기화 결과</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <SyncStepRow label="GOV 수집" step={lastSync?.gov_collect} showPlaceholder={!!lastSync} stepKey="gov" />
              <SyncStepRow label="MSIT 수집" step={lastSync?.msit_collect} showPlaceholder={!!lastSync} stepKey="msit" />
              <SyncStepRow
                label="키워드 처리"
                step={lastSync?.process_keywords}
                showPlaceholder={!!lastSync}
                stepKey="keywords"
              />
            </div>

            {!lastSync && !syncLoading && (
              <p className="mt-3 text-sm text-zinc-500">동기화를 실행하면 단계별 결과가 여기에 표시됩니다.</p>
            )}

            {lastSync?.all_success && !syncMessage && !syncLoading && (
              <p className="mt-3 text-sm font-medium text-emerald-300/90" role="status">
                모든 단계가 성공적으로 완료되었습니다.
              </p>
            )}

            {syncMessage && (
              <p className="mt-3 text-sm font-medium text-red-300" role="alert">
                {syncMessage}
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="요약 지표">
            <div className={kpiCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">전체 공고</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-50">
                {listLoading ? "…" : kpiMetrics.total}
              </p>
            </div>
            <div className={kpiCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">접수중</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-300">
                {listLoading ? "…" : kpiMetrics.open}
              </p>
            </div>
            <div className={kpiCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">추천 공고</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-200">
                {listLoading ? "…" : kpiMetrics.recommend}
              </p>
            </div>
            <div className={kpiCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">최근 7일 등록</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-200">
                {listLoading ? "…" : kpiMetrics.recent7}
              </p>
            </div>
          </section>
        </div>

        <section id="section-charts" className="mb-10 scroll-mt-24" aria-label="분포 차트 영역">
          <DashboardChartsRow
            categoryItems={chartCategoryItems}
            sourceItems={chartSourceItems}
            receptionSegments={chartReceptionSegments}
            monthlyRegistrations={listSummary?.by_month ?? null}
          />
        </section>

        <div id="section-programs" className="scroll-mt-24">
          {listError && (
            <div
              className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              {listError}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-400 sm:text-base">
              총 <strong className="font-semibold text-zinc-100">{listLoading ? "…" : totalCount}</strong>
              건
              {!listLoading && totalCount > 0 && (
                <span className="ml-2 font-normal text-zinc-500">
                  (페이지 {safePage} / {displayTotalPages})
                </span>
              )}
            </p>
          </div>

          {listLoading ? (
            <div
              className={`${cardSurface} border-dashed border-white/10 px-6 py-16 text-center text-zinc-400`}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-medium">목록을 불러오는 중입니다…</p>
            </div>
          ) : totalCount === 0 ? (
            <div className={`${cardSurface} px-6 py-16 text-center`}>
              <p className="text-sm text-zinc-400">
                조건에 맞는 공고가 없습니다. 필터를 바꾸거나 동기화를 실행해 보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
              {data.map((item) => {
                const rec = computeRecommendScore(item, {
                  appliedKeyword: appliedKeyword,
                  appliedCategory: appliedCategory,
                  appliedSource: appliedSource,
                  maxCreatedAt,
                });
                return (
                  <ProgramCard
                    key={item.id}
                    item={item}
                    rec={rec}
                    onSelect={setSelectedProgram}
                    fmtReceptionLine={fmtReceptionLine}
                  />
                );
              })}
            </div>
          )}

          {!listLoading && totalCount > 0 && (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="페이지 이동">
              <button
                type="button"
                className={`${btnSecondary} px-4 py-2`}
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </button>
              <span className="min-w-[4rem] text-center text-sm text-zinc-400">
                {safePage} / {displayTotalPages}
              </span>
              <button
                type="button"
                className={`${btnSecondary} px-4 py-2`}
                disabled={safePage >= displayTotalPages}
                onClick={() => setPage((p) => Math.min(displayTotalPages, p + 1))}
              >
                다음
              </button>
            </nav>
          )}
        </div>
      </main>

      {selectedProgram && (
        <ProgramDetailPanel
          program={selectedProgram}
          rec={selectedRec}
          onClose={closeDetailPanel}
          fmtReceptionLine={fmtReceptionLine}
        />
      )}
    </PlatformPageFrame>
  );
}
