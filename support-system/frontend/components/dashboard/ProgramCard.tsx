"use client";

import type { RecommendResult, ReceptionStatus } from "../../lib/recommendScore";
import type { SupportProgram } from "../../lib/dashboard-shared";
import {
  fmtText,
  firstNonEmpty,
  receptionBadgeClasses,
  sourceBadgeClasses,
  tierBadgeClasses,
  MISSING,
} from "../../lib/dashboard-shared";
import { getReceptionStatus } from "../../lib/recommendScore";
import { badgeBase, btnPrimarySm, btnSecondarySm } from "./ui-classes";

export type ProgramCardProps = {
  item: SupportProgram;
  rec: RecommendResult;
  onSelect: (item: SupportProgram) => void;
  fmtReceptionLine: (start: string | null | undefined, end: string | null | undefined) => string;
};

export function ProgramCard({ item, rec, onSelect, fmtReceptionLine }: ProgramCardProps) {
  const desc =
    item.description != null && String(item.description).trim() !== ""
      ? String(item.description).trim()
      : null;
  const receptionStatus = (item.reception_status && item.reception_status.trim()
    ? item.reception_status
    : getReceptionStatus(item.start_date, item.end_date)) as ReceptionStatus;

  return (
    <article
      onClick={() => onSelect(item)}
      className="group flex cursor-pointer flex-col rounded-xl border border-white/[0.08] bg-[#111111] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.9)] transition duration-200 hover:border-white/[0.18] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_50px_-12px_rgba(0,0,0,0.95)] sm:p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-zinc-100 sm:text-lg">
          {fmtText(item.title)}
        </h3>
        <span className={`${badgeBase} shrink-0 ${tierBadgeClasses(rec.tier)}`}>
          {rec.tier} · {rec.score}점
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className={`${badgeBase} ${sourceBadgeClasses(fmtText(item.source))}`}>{fmtText(item.source)}</span>
        <span className={`${badgeBase} border-white/10 bg-white/[0.06] text-zinc-300`}>
          {fmtText(item.category)}
        </span>
        <span className={`${badgeBase} ${receptionBadgeClasses(receptionStatus)}`}>{receptionStatus}</span>
      </div>

      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-400">{desc ?? MISSING}</p>

      <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3 text-sm text-zinc-300">
        <p>
          <span className="text-zinc-500">지원대상·주관</span>{" "}
          <span className="font-medium text-zinc-200">
            {fmtText(firstNonEmpty([item.target, item.organization]))}
          </span>
        </p>
        <p>
          <span className="text-zinc-500">접수기간</span>{" "}
          <span className="font-medium text-zinc-200">{fmtReceptionLine(item.start_date, item.end_date)}</span>
        </p>
      </div>

      {rec.reasons.length > 0 && (
        <p className="mt-2 text-xs font-medium text-zinc-400">추천 요인: {rec.reasons.join(" · ")}</p>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
          className={`${btnSecondarySm} flex-1 py-2.5`}
        >
          상세보기
        </button>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`${btnPrimarySm} flex-1 py-2.5 text-center no-underline`}
          >
            원문 보기
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-500">
            {MISSING}
          </span>
        )}
      </div>
    </article>
  );
}
