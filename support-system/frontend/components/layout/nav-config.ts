/** 플랫폼 전역 메뉴 (데이터 소스 레이어와 제안서 워크플로우 공통) */
export type PlatformNavItem = {
  href: string;
  label: string;
  /** 해시-only 등 pathname만으로 활성 판단 불가 */
  match?: "exact" | "prefix";
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/", label: "대시보드", match: "exact" },
  { href: "/proposals/new", label: "제안서 작성", match: "prefix" },
  { href: "/proposals", label: "내 제안서", match: "exact" },
  { href: "/company", label: "기업 정보", match: "prefix" },
  { href: "/#section-programs", label: "공고 탐색" },
  { href: "/analysis", label: "AI 분석", match: "prefix" },
  { href: "/settings", label: "설정", match: "prefix" },
];

export function isNavActive(pathname: string, item: PlatformNavItem): boolean {
  const href = item.href;
  if (href.startsWith("/#")) return false;
  const path = href as string;
  if (item.match === "exact" || !item.match) {
    if (path === "/") return pathname === "/";
    return pathname === path;
  }
  if (item.match === "prefix") {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  }
  return pathname === path;
}
