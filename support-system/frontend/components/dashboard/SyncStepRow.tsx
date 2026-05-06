"use client";

import type { SyncStepPayload } from "../../lib/dashboard-shared";
import { formatSyncStepDetail, formatSyncStepWarning } from "../../lib/dashboard-shared";

export type SyncStepRowProps = {
  label: string;
  step: SyncStepPayload | undefined;
  showPlaceholder: boolean;
  stepKey: "gov" | "msit" | "keywords";
};

export function SyncStepRow({ label, step, showPlaceholder, stepKey }: SyncStepRowProps) {
  if (!step && !showPlaceholder) return null;
  const ok = step?.success === true;
  const err = step?.error;
  const detail = formatSyncStepDetail(step, stepKey);
  const warn = formatSyncStepWarning(step);
  const box =
    step == null
      ? "border-white/[0.06] bg-white/[0.02] text-zinc-500"
      : ok
        ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100"
        : "border-red-500/25 bg-red-500/[0.08] text-red-200";

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${box}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-zinc-100">{label}</p>
        {ok && detail && <p className="text-xs font-medium leading-snug text-emerald-200/90">{detail}</p>}
        {ok && warn && <p className="text-xs font-medium text-amber-200/90">{warn}</p>}
        {!ok && step && (
          <p className="text-xs font-medium leading-snug text-red-200" role="alert">
            {err ?? "실패"}
          </p>
        )}
      </div>
      <span className="shrink-0 text-right text-sm font-semibold text-zinc-300 sm:pt-0.5">
        {!step && showPlaceholder ? "—" : ok ? "성공" : "실패"}
      </span>
    </div>
  );
}
