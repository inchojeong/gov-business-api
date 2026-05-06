import type { ReactNode } from "react";
import { PlatformNavProvider } from "../../components/layout/PlatformNavProvider";

export default function MainGroupLayout({ children }: { children: ReactNode }) {
  return <PlatformNavProvider>{children}</PlatformNavProvider>;
}
