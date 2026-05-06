"use client";

import { usePlatformNav } from "./PlatformNavProvider";

export function AppPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { openMobileNav } = usePlatformNav();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b0b0b]/90 backdrop-blur-md">
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={openMobileNav}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:bg-white/[0.06] lg:hidden"
          aria-label="메뉴 열기"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">{title}</h1>
          {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
        </div>
      </div>
    </header>
  );
}
