// === Meta Ads via Graph API (port de _meta_* do server.py) ===
import "server-only";
import { META } from "@/lib/env";
import type { DaySource } from "@/lib/types";

export interface MetaAction {
  action_type?: string;
  value?: string | number;
}

export interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  ctr?: string | number;
  cpc?: string | number;
  actions?: MetaAction[];
  date_start?: string;
  date?: string;
}

interface MetaPage {
  data?: MetaInsightRow[];
  paging?: { next?: string };
  error?: unknown;
}

async function metaGet(path: string, params: Record<string, string>): Promise<MetaPage | null> {
  if (!META.token) {
    console.error("[Meta] TOKEN ausente — sem dados");
    return null;
  }
  const qs = new URLSearchParams({ ...params, access_token: META.token });
  const url = `https://graph.facebook.com/${META.graphVersion}${path}?${qs}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as MetaPage;
    if (data.error) {
      console.error("[Meta] API error:", JSON.stringify(data.error));
      return null;
    }
    return data;
  } catch (e) {
    console.error("[Meta] request falhou:", e);
    return null;
  }
}

async function metaPaginate(path: string, params: Record<string, string>): Promise<MetaInsightRow[]> {
  const first = await metaGet(path, params);
  if (!first) return [];
  const rows: MetaInsightRow[] = [...(first.data ?? [])];
  let next = first.paging?.next;
  while (next) {
    try {
      const res = await fetch(next);
      const page = (await res.json()) as MetaPage;
      rows.push(...(page.data ?? []));
      next = page.paging?.next;
    } catch {
      break;
    }
  }
  return rows;
}

const LEADS_FILTER = JSON.stringify([
  { field: "campaign.name", operator: "CONTAIN", value: "[LEADS]" },
]);

/** Insights por campanha filtrando nome [LEADS]. */
export function metaInsights(dateFrom: string, dateTo: string): Promise<MetaInsightRow[]> {
  return metaPaginate(`/${META.account}/insights`, {
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions",
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    filtering: LEADS_FILTER,
    limit: "100",
  });
}

/** Campanhas [LEADS] para a tabela — mesmo escopo dos KPIs/timeline. */
export function metaAllCampaigns(dateFrom: string, dateTo: string): Promise<MetaInsightRow[]> {
  return metaPaginate(`/${META.account}/insights`, {
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions",
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    filtering: LEADS_FILTER,
    limit: "200",
  });
}

/** Insights diários (account-level, filtro [LEADS]) para a timeline. */
export function metaInsightsDaily(dateFrom: string, dateTo: string): Promise<MetaInsightRow[]> {
  return metaPaginate(`/${META.account}/insights`, {
    level: "account",
    fields: "spend,impressions,clicks,actions",
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    time_increment: "1",
    filtering: LEADS_FILTER,
    limit: "100",
  });
}

/** Usa APENAS o action_type "lead" (tipo-pai) para evitar dupla contagem. */
export function leadsFromActions(actions?: MetaAction[]): number {
  for (const a of actions ?? []) {
    if (a.action_type === "lead") return Math.trunc(Number(a.value ?? 0));
  }
  return 0;
}

export function metaDailyToSource(r: MetaInsightRow): DaySource {
  return {
    invest: Number(r.spend ?? 0),
    leads: leadsFromActions(r.actions),
    oport: 0,
    ganho: 0,
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
  };
}

export async function metaPing(): Promise<boolean> {
  const r = await metaGet("/me", { fields: "id,name" });
  return r !== null;
}
