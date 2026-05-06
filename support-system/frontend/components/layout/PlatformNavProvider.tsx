"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type PlatformNavContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
};

const PlatformNavContext = createContext<PlatformNavContextValue | null>(null);

export function PlatformNavProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileNav = useCallback(() => setMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({ mobileOpen, setMobileOpen, openMobileNav, closeMobileNav }),
    [mobileOpen, openMobileNav, closeMobileNav]
  );

  return <PlatformNavContext.Provider value={value}>{children}</PlatformNavContext.Provider>;
}

export function usePlatformNav(): PlatformNavContextValue {
  const ctx = useContext(PlatformNavContext);
  if (!ctx) {
    throw new Error("usePlatformNav must be used within PlatformNavProvider");
  }
  return ctx;
}
