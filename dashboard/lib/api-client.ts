"use client";
// Camada de fetch tipada (client-side) com timeout, abort e fallback mock.
import type { Campaign, FunnelData, Goals, Metrics, Platform, TimelineDay } from "@/lib/types";

/** GET JSON com timeout próprio + cancelamento via AbortSignal externo. */
async function getJSON<T>(url: string, ms: number, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), ms);
  const onAbort = () => ctrl.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) ctrl.abort(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export interface DashboardData {
  metrics: Metrics;
  timeline: TimelineDay[];
  funnel: FunnelData;
}

export function fetchMetrics(
  platform: Platform,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<Metrics> {
  const qs = new URLSearchParams({ from, to, platform });
  return getJSON<Metrics>(`/api/metrics?${qs}`, 20000, signal);
}

export function fetchDashboard(
  platform: Platform,
  from: string,
  to: string,
  month: string,
  signal?: AbortSignal,
): Promise<DashboardData> {
  const qs = new URLSearchParams({ from, to, platform });
  return Promise.all([
    getJSON<Metrics>(`/api/metrics?${qs}`, 20000, signal),
    getJSON<TimelineDay[]>(`/api/timeline?${qs}`, 20000, signal),
    getJSON<FunnelData>(`/api/funnel?${qs}&month=${month}`, 20000, signal),
  ]).then(([metrics, timeline, funnel]) => ({ metrics, timeline, funnel }));
}

export function fetchCampaigns(
  platform: Platform,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<Campaign[]> {
  const qs = new URLSearchParams({ from, to, platform });
  return getJSON<Campaign[]>(`/api/campaigns?${qs}`, 25000, signal);
}

export function fetchGoals(month: string, signal?: AbortSignal): Promise<Goals> {
  return getJSON<Goals>(`/api/goals?month=${month}`, 10000, signal);
}

export async function saveGoals(month: string, goals: Partial<Goals>): Promise<void> {
  await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, ...goals }),
  });
}
