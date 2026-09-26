"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import SeapaloHeader, { type SeapaloNavKey } from "@/components/shared/seapalo-header";

const NAV_KEYS: SeapaloNavKey[] = ["forecast", "multiday", "riskmap", "status"];

function isNavKey(value: string | null): value is SeapaloNavKey {
  return value !== null && (NAV_KEYS as string[]).includes(value);
}

/**
 * Header telemetry owned by the page that fetches the data, rendered by the
 * shell that owns the tab state. The header lives in the layout so it does not
 * re-mount per route, so it cannot read that data directly.
 */
export type HeaderTelemetry = {
  locationName?: string;
  lat?: number;
  lon?: number;
  updatedLabel?: string;
  online?: boolean;
  surgeLabel?: string;
};

type AppShellValue = {
  telemetry: HeaderTelemetry;
  setTelemetry: (next: HeaderTelemetry) => void;
  switchTab: (tab: SeapaloNavKey) => void;
};

const AppShellContext = createContext<AppShellValue | null>(null);

function noop() {}

/** Switches tabs from inside a panel. A no-op outside the shell. */
export function useSwitchTab(): (tab: SeapaloNavKey) => void {
  return useContext(AppShellContext)?.switchTab ?? noop;
}

/**
 * Publishes header telemetry. The hook is a no-op outside the shell so a
 * component rendered in isolation (a test, a story) does not throw.
 */
export function useHeaderTelemetry(next: HeaderTelemetry): void {
  const ctx = useContext(AppShellContext);
  const setTelemetry = ctx?.setTelemetry;
  const serialized = JSON.stringify(next);

  useEffect(() => {
    setTelemetry?.(JSON.parse(serialized) as HeaderTelemetry);
  }, [serialized, setTelemetry]);
}

/**
 * Owns the tab state and the header, and renders `children` inside the tab
 * root so `TabsContent` in a page can bind to it.
 *
 * On `/` the header nav *is* the tab list (Radix triggers, so arrow-key
 * navigation and `aria-selected` come from one implementation). On other
 * routes there is no tab content, so the header renders plain links.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";

  const paramTab = searchParams?.get("tab") ?? null;
  // The URL is the single source of truth, so deep links and browser back
  // work without a mirroring effect.
  const activeTab: SeapaloNavKey = isNavKey(paramTab) ? paramTab : "forecast";
  const [telemetry, setTelemetry] = useState<HeaderTelemetry>({});

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!isNavKey(tab)) return;
      const params = new URLSearchParams(searchParams?.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      // Measure the sticky header rather than hardcoding its height, which
      // changes with the wrapped nav row on narrow viewports.
      requestAnimationFrame(() => {
        const headerEl = document.getElementById("app-header");
        if (!headerEl) return;
        const y = window.scrollY - headerEl.getBoundingClientRect().height - 16;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      });
    },
    [router, pathname, searchParams],
  );

  const value = useMemo(
    () => ({ telemetry, setTelemetry, switchTab: handleTabChange }),
    [telemetry, handleTabChange],
  );

  const header = (
    <SeapaloHeader
      active={isHome ? activeTab : "status"}
      onNavigate={isHome ? handleTabChange : undefined}
      locationName={telemetry.locationName}
      lat={telemetry.lat}
      lon={telemetry.lon}
      updatedLabel={telemetry.updatedLabel}
      online={telemetry.online}
      surgeLabel={telemetry.surgeLabel}
    />
  );

  return (
    <AppShellContext.Provider value={value}>
      {isHome ? (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {header}
          {children}
        </Tabs>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
      <Toaster />
    </AppShellContext.Provider>
  );
}
