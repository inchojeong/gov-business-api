"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartBarItem = { label: string; value: number; max: number };

export type ChartPieSegment = { name: string; value: number };

/** 월별 등록 추이 — 백엔드 summary 확장 시 주입 */
export type MonthlyRegistrationPoint = { month: string; count: number };

const cardClass =
  "rounded-xl border border-white/[0.08] bg-[#111111] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_40px_-12px_rgba(0,0,0,0.85)] sm:p-6";

const CATEGORY_FILL = [
  "#71717a",
  "#a1a1aa",
  "#52525b",
  "#d4d4d8",
  "#3f3f46",
  "#78716c",
  "#a8a29e",
];

const SOURCE_FILL: Record<string, string> = {
  GOV: "#38bdf8",
  MSIT: "#4ade80",
  기타: "#a1a1aa",
};

const RECEPTION_FILL: Record<string, string> = {
  접수중: "#2dd4bf",
  예정: "#e4e4e7",
  마감: "#71717a",
  기간미상: "#a8a29e",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    name?: string;
    value?: number;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p?.payload;
  const name =
    row && typeof row.month === "string"
      ? String(row.month)
      : row && typeof row.name === "string"
        ? String(row.name)
        : (p?.name ?? label ?? "");
  const value =
    row && typeof row.count === "number"
      ? row.count
      : typeof p?.value === "number"
        ? p.value
        : Number(p?.value ?? 0);
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-zinc-100">{name}</p>
      <p className="tabular-nums text-zinc-400">{value}건</p>
    </div>
  );
}

function barItemsToRecords(items: ChartBarItem[]): { name: string; value: number }[] {
  return items.map((i) => ({ name: i.label, value: i.value }));
}

type CategoryDonutCardProps = {
  title: string;
  description?: string;
  items: ChartBarItem[];
  emptyHint?: string;
};

export function CategoryDonutCard({
  title,
  description,
  items,
  emptyHint = "데이터가 없습니다.",
}: CategoryDonutCardProps) {
  const data = barItemsToRecords(items).filter((d) => d.value > 0);

  return (
    <div className={cardClass}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{emptyHint}</p>
      ) : (
        <div className="h-[260px] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="72%"
                paddingAngle={1}
                stroke="#0b0b0b"
                strokeWidth={1}
              >
                {data.map((_, i) => (
                  <Cell key={`c-${i}`} fill={CATEGORY_FILL[i % CATEGORY_FILL.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

type SourceBarCardProps = {
  title: string;
  description?: string;
  items: ChartBarItem[];
  emptyHint?: string;
};

export function SourceBarCard({
  title,
  description,
  items,
  emptyHint = "데이터가 없습니다.",
}: SourceBarCardProps) {
  const data = barItemsToRecords(items).filter((d) => d.value > 0);

  return (
    <div className={cardClass}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{emptyHint}</p>
      ) : (
        <div className="h-[260px] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={{ stroke: "#3f3f46" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.06)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((entry, i) => (
                  <Cell
                    key={`s-${entry.name}-${i}`}
                    fill={SOURCE_FILL[entry.name] ?? SOURCE_FILL["기타"]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

type ReceptionDonutCardProps = {
  title: string;
  description?: string;
  segments: ChartPieSegment[];
  emptyHint?: string;
};

export function ReceptionDonutCard({
  title,
  description,
  segments,
  emptyHint = "데이터가 없습니다.",
}: ReceptionDonutCardProps) {
  const data = segments.filter((s) => s.value > 0);

  return (
    <div className={cardClass}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{emptyHint}</p>
      ) : (
        <div className="h-[260px] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="72%"
                paddingAngle={1}
                stroke="#0b0b0b"
                strokeWidth={1}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={`r-${entry.name}-${i}`}
                    fill={RECEPTION_FILL[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

type RegistrationTrendCardProps = {
  title: string;
  description?: string;
  /** 백엔드에서 월별 집계가 오면 Recharts Line/Area로 교체 */
  points?: MonthlyRegistrationPoint[] | null;
};

export function RegistrationTrendCard({
  title,
  description,
  points,
}: RegistrationTrendCardProps) {
  const chartData =
    points?.map((p) => ({ month: p.month, count: p.count })).filter((d) => d.count >= 0) ?? [];
  const hasData = chartData.length > 0;

  return (
    <div className={cardClass}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
      </div>
      {hasData ? (
        <div className="h-[260px] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={{ stroke: "#3f3f46" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="등록 건수"
                stroke="#a1a1aa"
                strokeWidth={2}
                dot={{ r: 3, fill: "#e4e4e7", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center"
          role="status"
          aria-label="최근 등록 추이 차트 준비 중"
        >
          <p className="text-sm font-medium text-zinc-400">월별 등록 추이</p>
          <p className="max-w-xs text-xs leading-relaxed text-zinc-500">
            현재 API에는 월별 집계가 포함되어 있지 않습니다. 추후 summary에 월별 배열이 포함되면 이 영역에
            라인 차트가 표시됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

/** @deprecated 기존 import 호환 — 도넛 차트로 대체됨 */
export function DistributionChartCard({
  title,
  description,
  items,
  barClassName: _barClassName,
  emptyHint = "데이터가 없습니다.",
}: {
  title: string;
  description?: string;
  items: ChartBarItem[];
  barClassName?: string;
  emptyHint?: string;
}) {
  return <CategoryDonutCard title={title} description={description} items={items} emptyHint={emptyHint} />;
}

type DashboardChartsRowProps = {
  categoryItems: ChartBarItem[];
  sourceItems: ChartBarItem[];
  receptionSegments: ChartPieSegment[];
  /** summary.by_month 등 확장 시 전달 */
  monthlyRegistrations?: MonthlyRegistrationPoint[] | null;
};

export function DashboardChartsRow({
  categoryItems,
  sourceItems,
  receptionSegments,
  monthlyRegistrations = null,
}: DashboardChartsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      <CategoryDonutCard
        title="카테고리별 공고 분포"
        description="필터·검색 조건에 맞는 전체 공고 기준"
        items={categoryItems}
      />
      <SourceBarCard
        title="출처별 수집 현황"
        description="GOV·MSIT 및 기타 출처 건수"
        items={sourceItems}
      />
      <ReceptionDonutCard
        title="접수상태 분포"
        description="접수중·예정·마감·기간미상 비율"
        segments={receptionSegments}
      />
      <RegistrationTrendCard
        title="최근 등록 추이"
        description="월별 신규 등록 건수(백엔드 확장 예정)"
        points={monthlyRegistrations}
      />
    </div>
  );
}
