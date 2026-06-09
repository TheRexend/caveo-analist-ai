"use client";
// Camada de fetch tipada (client-side) com timeout e fallback mock.
import type { Campaign, FunnelData, Goals, Metrics, Platform, TimelineDay } from "@/lib/types";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function getJSON<T>(url: string, ms: number): Promise<T> {
  return withTimeout(
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<T>;
    }),
    ms,
  );
}

export interface DashboardData {
  metrics: Metrics;
  timeline: TimelineDay[];
  funnel: FunnelData;
}

export function fetchDashboard(
  platform: Platform,
  from: string,
  to: string,
  month: string,
): Promise<DashboardData> {
  const qs = new URLSearchParams({ from, to, platform });
  return withTimeout(
    Promise.all([
      getJSON<Metrics>(`/api/metrics?${qs}`, 20000),
      getJSON<TimelineDay[]>(`/api/timeline?${qs}`, 20000),
      getJSON<FunnelData>(`/api/funnel?${qs}&month=${month}`, 20000),
    ]).then(([metrics, timeline, funnel]) => ({ metrics, timeline, funnel })),
    20000,
  );
}

export function fetchCampaigns(platform: Platform, from: string, to: string): Promise<Campaign[]> {
  const qs = new URLSearchParams({ from, to, platform });
  return getJSON<Campaign[]>(`/api/campaigns?${qs}`, 25000);
}

export function fetchGoals(month: string): Promise<Goals> {
  return getJSON<Goals>(`/api/goals?month=${month}`, 10000);
}

export async function saveGoals(month: string, goals: Partial<Goals>): Promise<void> {
  await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, ...goals }),
  });
}
