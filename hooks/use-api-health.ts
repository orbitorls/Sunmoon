"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Provider health as reported by GET /api/health.
 *
 * `status` is measured per provider; `latencyMs` is a real round-trip time
 * taken around the probe request. A provider that is `disabled` (no API key
 * configured) never reports a latency, because nothing was probed.
 */
export type HealthProviderStatus = "ok" | "error" | "disabled";

export type HealthProvider = {
  status: HealthProviderStatus;
  message: string;
  code?: number;
  latencyMs?: number;
  testLocation?: string;
  temperature?: number;
  dataPoints?: number;
};

export type ApiHealth = {
  /** True only when every probed provider is `ok`. */
  allHealthy: boolean;
  checkedAt: string | null;
  providers: Record<string, HealthProvider>;
};

export type ApiHealthResult = {
  health: ApiHealth;
  loading: boolean;
  refresh: () => void;
};

const EMPTY_HEALTH: ApiHealth = {
  allHealthy: false,
  checkedAt: null,
  providers: {},
};

function isHealthProvider(value: unknown): value is HealthProvider {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.status === "string" && typeof candidate.message === "string";
}

function parseHealth(payload: unknown): ApiHealth | null {
  if (typeof payload !== "object" || payload === null) return null;
  const apis = (payload as Record<string, unknown>).apis;
  if (typeof apis !== "object" || apis === null) return null;

  const entries = Object.entries(apis as Record<string, unknown>).filter(([, value]) =>
    isHealthProvider(value),
  );
  if (entries.length === 0) return null;

  const providers: Record<string, HealthProvider> = {};
  for (const [name, value] of entries) {
    providers[name] = value as HealthProvider;
  }

  const timestamp = (payload as Record<string, unknown>).timestamp;
  return {
    allHealthy: entries.every(([, value]) => (value as HealthProvider).status === "ok"),
    checkedAt: typeof timestamp === "string" ? timestamp : null,
    providers,
  };
}

/**
 * Probes provider health on mount and exposes a manual refresh.
 *
 * A 503 is treated as a successful measurement rather than a failure: the
 * route returns 503 precisely when a provider is down, and "down with a known
 * latency" is exactly the state this hook exists to report.
 */
export function useApiHealth(isHydrated: boolean): ApiHealthResult {
  const [health, setHealth] = useState<ApiHealth>(EMPTY_HEALTH);
  const [loading, setLoading] = useState(true);

  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchHealth = useCallback(async () => {
    if (!isHydrated || inFlightRef.current) return;

    inFlightRef.current = true;
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (requestIdRef.current !== requestId) return;

      const parsed = parseHealth(await response.json());
      if (parsed) setHealth(parsed);
    } catch (error) {
      console.error("Failed to load API health:", error);
    } finally {
      if (requestIdRef.current === requestId) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [isHydrated]);

  useEffect(() => {
    // Matches the fetch-on-mount pattern used by `useForecastData`; the
    // setState calls live inside the async callback, not the effect body.
    void fetchHealth();
  }, [fetchHealth]);

  return { health, loading, refresh: fetchHealth };
}
