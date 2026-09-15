"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// The 4 bottom-nav tabs, in on-screen left-to-right order — everything else
// (profile, recipe detail, login/signup, …) just fades in with no direction.
const TAB_ORDER = ["/", "/recipes", "/grocery-list", "/nutrition"];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // "Adjusting state when a prop changes" — computed synchronously during render
  // (not an effect) so the very first paint of the newly-keyed node already
  // carries the right class, with no stale-direction flash on the frame before.
  const [state, setState] = useState<{ pathname: string; direction: "left" | "right" | "none" }>(() => ({
    pathname,
    direction: "none",
  }));

  if (state.pathname !== pathname) {
    const prevIndex = TAB_ORDER.indexOf(state.pathname);
    const nextIndex = TAB_ORDER.indexOf(pathname);
    const direction =
      prevIndex === -1 || nextIndex === -1 || prevIndex === nextIndex
        ? "none"
        : nextIndex > prevIndex
          ? "right"
          : "left";
    setState({ pathname, direction });
  }

  return (
    <div key={pathname} className={state.direction !== "none" ? `tab-slide-in-${state.direction}` : "page-fade-in"}>
      {children}
    </div>
  );
}
