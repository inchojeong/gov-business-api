"use client";

import type { ReactNode } from "react";
import { Sidebar, type ExploreSidebarToolsProps } from "../dashboard/Sidebar";
import { usePlatformNav } from "./PlatformNavProvider";

export function PlatformPageFrame({
  children,
  exploreTools,
}: {
  children: ReactNode;
  exploreTools?: ExploreSidebarToolsProps;
}) {
  const { mobileOpen, closeMobileNav } = usePlatformNav();

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100 antialiased">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden"
          aria-label="메뉴 닫기"
          onClick={closeMobileNav}
        />
      ) : null}
      <Sidebar exploreTools={exploreTools} onNavigate={closeMobileNav} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
