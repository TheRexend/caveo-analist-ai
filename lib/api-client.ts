"use client";
// Camada de fetch tipada (client-side) com timeout, abort e fallback mock.
import type {
  DashboardPayload, FunnelDrillKey, GA4Payload, Goals,
  HealthPayload, OpportunityRow, Platform,
} from "@/lib/types";

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

/** Carga única e consolidada de todo o dashboard (substitui os múltiplos fetches). */
export function fetchDashboardAll(
  platform: Platform,
  from: string,
  to: string,
  apenasLeads: boolean,
  cruzamento: boolean,
  fresh = false,
  signal?: AbortSignal,
): Promise<DashboardPayload> {
  const qs = new URLSearchParams({ from, to, platform });
  if (!apenasLeads) qs.set("apenasLeads", "0");
  if (!cruzamento) qs.set("cruzamento", "0");
  if (fresh) qs.set("fresh", "1");
  return getJSON<DashboardPayload>(`/api/dashboard?${qs}`, 30000, signal);
}

/** Drill-down: lista de oportunidades de um estágio do funil, com os filtros atuais. */
export function fetchOpportunities(
  platform: Platform,
  from: string,
  to: string,
  stage: FunnelDrillKey,
  cruzamento: boolean,
  signal?: AbortSignal,
): Promise<OpportunityRow[]> {
  const qs = new URLSearchParams({ from, to, platform, stage });
  if (!cruzamento) qs.set("cruzamento", "0");
  return getJSON<OpportunityRow[]>(`/api/opportunities?${qs}`, 25000, signal);
}

/** Carga da aba Sítio/GA4 (independente do dashboard de mídia). */
export function fetchGA4(
  from: string,
  to: string,
  fresh = false,
  signal?: AbortSignal,
): Promise<GA4Payload> {
  const qs = new URLSearchParams({ from, to });
  if (fresh) qs.set("fresh", "1");
  return getJSON<GA4Payload>(`/api/ga4?${qs}`, 30000, signal);
}

export function fetchGoals(month: string, signal?: AbortSignal): Promise<Goals> {
  return getJSON<Goals>(`/api/goals?month=${month}`, 10000, signal);
}

/** Status (ping) de cada integração externa para os indicadores de saúde. */
export function fetchHealth(signal?: AbortSignal): Promise<HealthPayload> {
  return getJSON<HealthPayload>(`/api/health`, 15000, signal);
}

export async function saveGoals(month: string, goals: Partial<Goals>): Promise<void> {
  await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, ...goals }),
  });
}
