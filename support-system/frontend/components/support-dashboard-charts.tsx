"use client";

export type ChartBarItem = { label: string; value: number; max: number };

function MiniBarRow({ item, barClassName }: { item: ChartBarItem; barClassName: string }) {
  const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-xs font-medium text-slate-600 sm:w-28" title={item.label}>
        {item.label}
      </span>
      <div className="min-w-0 flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className={`h-full rounded-full transition-all ${barClassName}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums font-semibold text-slate-800">
        {item.value}
      </span>
    </div>
  );
}

type DistributionChartCardProps = {
  title: string;
  description?: string;
  items: ChartBarItem[];
  barClassName?: string;
  emptyHint?: string;
};

/** Placeholder chart: Tailwind bars only — swap container for Recharts later. */
export function DistributionChartCard({
  title,
  description,
  items,
  barClassName = "bg-slate-600/85",
  emptyHint = "데이터가 없습니다.",
}: DistributionChartCardProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-600">{description}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <MiniBarRow key={item.label} item={item} barClassName={barClassName} />
          ))}
        </div>
      )}
    </div>
  );
}

type DashboardChartsRowProps = {
  categoryItems: ChartBarItem[];
  sourceItems: ChartBarItem[];
};

export function DashboardChartsRow({ categoryItems, sourceItems }: DashboardChartsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      <DistributionChartCard
        title="카테고리별 분포"
        description="현재 목록 기준 상대 비율(플레이스홀더)"
        items={categoryItems}
        barClassName="bg-slate-600/80"
      />
      <DistributionChartCard
        title="출처별 수집 현황"
        description="GOV·MSIT 건수 비교(플레이스홀더)"
        items={sourceItems}
        barClassName="bg-emerald-700/70"
      />
    </div>
  );
}
