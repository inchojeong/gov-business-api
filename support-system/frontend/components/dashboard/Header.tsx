"use client";

import { usePlatformNav } from "../layout/PlatformNavProvider";
import { btnPrimarySm, btnSecondarySm, inputClass, labelClass } from "./ui-classes";

export type HeaderProps = {
  filterKeyword: string;
  onKeywordChange: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onSync: () => void;
  syncLoading: boolean;
  listLoading: boolean;
};

export function Header({
  filterKeyword,
  onKeywordChange,
  onSearch,
  onReset,
  onSync,
  syncLoading,
  listLoading,
}: HeaderProps) {
  const { openMobileNav } = usePlatformNav();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b0b0b]/90 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={openMobileNav}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:bg-white/[0.06] lg:hidden"
            aria-label="메뉴 열기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <label className="flex flex-col gap-1.5">
              <span className={`${labelClass} hidden sm:block`}>검색</span>
              <input
                type="search"
                value={filterKeyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="사업명·키워드 검색…"
                className={inputClass}
                autoComplete="off"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => void onSearch()}
            disabled={listLoading}
            className={`${btnPrimarySm} min-w-[88px] flex-1 sm:flex-none`}
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => void onReset()}
            disabled={listLoading}
            className={`${btnSecondarySm} min-w-[88px] flex-1 sm:flex-none`}
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={syncLoading}
            className={`${btnSecondarySm} min-w-[120px] flex-1 border-emerald-500/25 text-emerald-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 sm:flex-none`}
          >
            {syncLoading ? "동기화 중…" : "데이터 동기화"}
          </button>
        </div>
      </div>
    </header>
  );
}
