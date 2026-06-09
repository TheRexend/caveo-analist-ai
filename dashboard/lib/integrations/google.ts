// === Google Ads via REST API (substitui o SDK gRPC do server.py) ===
// Fluxo: refresh_token → access_token (oauth2.googleapis.com) →
// POST googleAds:searchStream com headers developer-token + login-customer-id.
import "server-only";
import { GOOGLE } from "@/lib/env";
import type { DaySource } from "@/lib/types";

let _accessToken: string | null = null;
let _tokenExpiry = 0;

async function googleAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (_accessToken && now < _tokenExpiry) return _accessToken;

  const creds = GOOGLE.creds;
  if (!creds.client_id || !creds.client_secret || !creds.refresh_token) {
    console.error("[Google] credenciais authorized_user ausentes");
    return null;
  }
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      console.error("[Google] falha no OAuth:", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in?: number };
    _accessToken = json.access_token;
    _tokenExpiry = now + (json.expires_in ?? 3600) * 1000 - 60_000; // 60s de margem
    return _accessToken;
  } catch (e) {
    console.error("[Google] erro no OAuth:", e);
    return null;
  }
}

// Tipos achatados do retorno REST (int64 vêm como string)
interface GoogleRow {
  campaign?: { id?: string; name?: string };
  metrics?: {
    costMicros?: string | number;
    impressions?: string | number;
    clicks?: string | number;
    ctr?: number;
    averageCpc?: string | number;
    conversions?: number;
  };
  segments?: { date?: string };
}

interface SearchStreamBatch {
  results?: GoogleRow[];
}

async function gaqlSearchStream(query: string): Promise<GoogleRow[]> {
  const token = await googleAccessToken();
  if (!token || !GOOGLE.devToken) return [];

  const url = `https://googleads.googleapis.com/${GOOGLE.apiVersion}/customers/${GOOGLE.targetCustomerId}/googleAds:searchStream`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "developer-token": GOOGLE.devToken,
        "login-customer-id": GOOGLE.loginCustomerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      console.error("[Google] searchStream falhou:", res.status, await res.text());
      return [];
    }
    // searchStream devolve um array de batches { results: [...] }
    const batches = (await res.json()) as SearchStreamBatch[];
    const rows: GoogleRow[] = [];
    for (const b of batches) rows.push(...(b.results ?? []));
    return rows;
  } catch (e) {
    console.error("[Google] erro na query:", e);
    return [];
  }
}

const n = (v: string | number | undefined): number =>
  typeof v === "string" ? Number(v) : v ?? 0;

export interface GoogleCampaignsResult {
  results: Array<{
    campaign: { id: string; name: string };
    metrics: {
      costMicros: number;
      impressions: number;
      clicks: number;
      ctr: number;
      averageCpc: number;
      conversions: number;
    };
  }>;
}

/** Campanhas com custo > 0 no período. Retorna null se não há credenciais. */
export async function googleCampaigns(
  dateFrom: string,
  dateTo: string,
): Promise<GoogleCampaignsResult | null> {
  if (!GOOGLE.devToken || !GOOGLE.creds.refresh_token) return null;
  const gaql = `
    SELECT
      campaign.id, campaign.name,
      metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
      metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND metrics.cost_micros > 0
  `.trim();
  const rows = await gaqlSearchStream(gaql);
  return {
    results: rows.map((r) => ({
      campaign: { id: r.campaign?.id ?? "?", name: r.campaign?.name ?? "" },
      metrics: {
        costMicros: n(r.metrics?.costMicros),
        impressions: n(r.metrics?.impressions),
        clicks: n(r.metrics?.clicks),
        ctr: n(r.metrics?.ctr),
        averageCpc: n(r.metrics?.averageCpc),
        conversions: n(r.metrics?.conversions),
      },
    })),
  };
}

/** Agregado diário por data: { "2026-06-01": DaySource, ... } */
export async function googleDaily(
  dateFrom: string,
  dateTo: string,
): Promise<Record<string, DaySource>> {
  if (!GOOGLE.devToken || !GOOGLE.creds.refresh_token) return {};
  const gaql = `
    SELECT segments.date,
           metrics.cost_micros, metrics.impressions,
           metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
  `.trim();
  const rows = await gaqlSearchStream(gaql);
  const byDate: Record<string, DaySource> = {};
  for (const r of rows) {
    const d = r.segments?.date;
    if (!d) continue;
    if (!byDate[d]) {
      byDate[d] = { invest: 0, leads: 0, oport: 0, ganho: 0, impressions: 0, clicks: 0 };
    }
    byDate[d].invest += n(r.metrics?.costMicros) / 1_000_000;
    byDate[d].leads += Math.trunc(n(r.metrics?.conversions));
    byDate[d].impressions += n(r.metrics?.impressions);
    byDate[d].clicks += n(r.metrics?.clicks);
  }
  return byDate;
}

export async function googlePing(): Promise<boolean> {
  return (await googleAccessToken()) !== null;
}
