"use client";

import type { RecommendResult } from "../../lib/recommendScore";
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

export type ProgramDetailPanelProps = {
  program: SupportProgram;
  rec: RecommendResult | null;
  onClose: () => void;
  fmtReceptionLine: (start: string | null | undefined, end: string | null | undefined) => string;
};

export function ProgramDetailPanel({ program, rec, onClose, fmtReceptionLine }: ProgramDetailPanelProps) {
  const status = getReceptionStatus(program.start_date, program.end_date);
  const kwList = program.keywords && program.keywords.length > 0 ? program.keywords : [];

  const innerCard = "rounded-xl border border-white/[0.08] bg-[#141414] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="공고 상세"
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[min(560px,100vw)] flex-col gap-4 overflow-y-auto border-l border-white/[0.08] bg-[#0b0b0b] p-4 shadow-2xl sm:p-6"
      >
        <div className={`flex items-start justify-between gap-3 ${innerCard} px-4 py-3 sm:px-5 sm:py-4`}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">공고 상세</h2>
          <button type="button" onClick={onClose} className={`${btnSecondarySm} shrink-0`}>
            닫기
          </button>
        </div>

        <div className={innerCard}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">추천 점수</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-zinc-100">{rec?.score ?? 0}</p>
              <p className="mt-0.5 text-sm text-zinc-500">100점 만점 기준 누적</p>
            </div>
            <span className={`${badgeBase} ${tierBadgeClasses(rec?.tier ?? "일반")}`}>{rec?.tier ?? "일반"}</span>
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0f0f0f] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">추천 사유</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-200">
              {rec && rec.reasons.length > 0 ? rec.reasons.join(" · ") : MISSING}
            </p>
          </div>
          <p className="mt-4 text-base font-semibold leading-snug text-zinc-100">{fmtText(program.title)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`${badgeBase} ${sourceBadgeClasses(fmtText(program.source))}`}>
              {fmtText(program.source)}
            </span>
            <span className={`${badgeBase} border-white/10 bg-white/[0.06] text-zinc-300`}>
              {fmtText(program.category)}
            </span>
            <span className={`${badgeBase} ${receptionBadgeClasses(status)}`}>{status}</span>
          </div>
        </div>

        <div className={innerCard}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">등록 키워드</h3>
          {kwList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {kwList.map((k, i) => (
                <span
                  key={`${k}-${i}`}
                  className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-zinc-300"
                >
                  {k}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{MISSING}</p>
          )}
        </div>

        <div className={innerCard}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">주요 정보</h3>
          <dl className="space-y-3 text-sm text-zinc-300">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-zinc-500 sm:w-28">지원대상</dt>
              <dd className="min-w-0 font-medium text-zinc-200">
                {fmtText(firstNonEmpty([program.target, program.support_target, program.organization]))}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-zinc-500 sm:w-28">지원규모</dt>
              <dd className="min-w-0 font-medium text-zinc-200">
                {fmtText(firstNonEmpty([program.scale, program.support_scale]))}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-zinc-500 sm:w-28">접수기간</dt>
              <dd className="min-w-0 font-medium text-zinc-200">
                {fmtReceptionLine(program.start_date, program.end_date)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-zinc-500 sm:w-28">과제수행기간</dt>
              <dd className="min-w-0 font-medium text-zinc-200">
                {fmtText(
                  firstNonEmpty([program.project_period, program.task_period, program.perform_period])
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-zinc-500 sm:w-28">주관/담당기관</dt>
              <dd className="min-w-0 font-medium text-zinc-200">
                {fmtText(firstNonEmpty([program.organization, program.manager_org, program.agency]))}
              </dd>
            </div>
          </dl>
        </div>

        <div className={innerCard}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">지원내용 전체</h3>
          <p className="text-sm font-medium leading-relaxed text-zinc-200">{fmtText(program.description)}</p>
        </div>

        {program.url ? (
          <a
            href={program.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnPrimarySm} mt-auto w-full justify-center py-3 no-underline`}
          >
            공고 원문 링크
          </a>
        ) : (
          <span className="text-center text-sm text-zinc-500">{MISSING}</span>
        )}
      </aside>
    </div>
  );
}
