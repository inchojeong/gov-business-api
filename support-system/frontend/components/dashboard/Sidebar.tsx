"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReceptionStatus } from "../../lib/recommendScore";
import type { SortOrderKey } from "../../lib/dashboard-shared";
import {
  CATEGORY_OPTIONS,
  RECEPTION_STATUS_OPTIONS,
  SORT_ORDER_OPTIONS,
  SOURCE_OPTIONS,
} from "../../lib/dashboard-shared";
import { PLATFORM_NAV, isNavActive } from "../layout/nav-config";
import { usePlatformNav } from "../layout/PlatformNavProvider";
import { inputClass, labelClass } from "./ui-classes";

const exploreNavItems = [
  { href: "#section-overview", label: "요약" },
  { href: "#section-charts", label: "분석" },
  { href: "#section-programs", label: "공고 목록" },
] as const;

export type ExploreSidebarToolsProps = {
  filterCategory: string;
  filterSource: string;
  filterReceptionStatus: ReceptionStatus | "";
  sortOrder: SortOrderKey;
  onFilterCategory: (v: string) => void;
  onFilterSource: (v: string) => void;
  onFilterReception: (v: ReceptionStatus | "") => void;
  onSortOrder: (v: SortOrderKey) => void;
};

export type SidebarProps = {
  /** 대시보드(공고 탐색) 전용 필터·앵커. 없으면 플랫폼 메뉴만 표시 */
  exploreTools?: ExploreSidebarToolsProps;
  onNavigate?: () => void;
};

export function Sidebar({ exploreTools, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { mobileOpen } = usePlatformNav();

  const navLinkClass = (active: boolean) =>
    `block rounded-lg px-2 py-2 text-sm font-medium transition ${
      active ? "bg-white/[0.08] text-zinc-50" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
    }`;

  return (
    <aside
      className={`flex h-screen min-h-0 w-72 max-w-[min(18rem,88vw)] shrink-0 flex-col border-white/[0.06] bg-[#0b0b0b] transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-auto lg:min-h-screen lg:w-56 lg:max-w-none lg:translate-x-0 lg:border-r ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } fixed inset-y-0 left-0 z-50 lg:relative`}
    >
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-5 lg:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Proposal SaaS</p>
        <p className="mt-1 text-sm font-semibold tracking-tight text-zinc-100">사업제안서</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">작성 · 분석 · 연계</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:px-4" aria-label="플랫폼 메뉴">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">메뉴</p>
        <ul className="space-y-0.5">
          {PLATFORM_NAV.map((item) => {
            const active = isNavActive(pathname, item);
            if (item.href.startsWith("/#")) {
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={navLinkClass(false)}
                    onClick={() => onNavigate?.()}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate?.()}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {exploreTools ? (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              이 페이지
            </p>
            <ul className="mb-4 space-y-0.5">
              {exploreNavItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className="block rounded-lg px-2 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">필터</p>
            <p className="mb-3 px-2 text-xs leading-relaxed text-zinc-500">
              키워드는 상단에서 적용합니다. 카테고리·출처는 <span className="text-zinc-400">검색</span> 시 반영됩니다.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>카테고리</span>
                <select
                  value={exploreTools.filterCategory}
                  onChange={(e) => exploreTools.onFilterCategory(e.target.value)}
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
                  value={exploreTools.filterSource}
                  onChange={(e) => exploreTools.onFilterSource(e.target.value)}
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
                  value={exploreTools.filterReceptionStatus}
                  onChange={(e) => exploreTools.onFilterReception(e.target.value as ReceptionStatus | "")}
                  className={inputClass}
                >
                  {RECEPTION_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.label + opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>정렬</span>
                <select
                  value={exploreTools.sortOrder}
                  onChange={(e) => exploreTools.onSortOrder(e.target.value as SortOrderKey)}
                  className={inputClass}
                >
                  {SORT_ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}
      </nav>
    </aside>
  );
}
