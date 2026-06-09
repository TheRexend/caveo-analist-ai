// === Builders de Campaign a partir das respostas das plataformas ===
import type { Campaign } from "@/lib/types";
import type { GoogleCampaignsResult } from "@/lib/integrations/google";
import { leadsFromActions, type MetaInsightRow } from "@/lib/integrations/meta";

export function buildMetaCampaigns(rows: MetaInsightRow[]): Campaign[] {
  return rows.map((r) => {
    const invest = Number(r.spend ?? 0);
    const impr = Number(r.impressions ?? 0);
    const clicks = Number(r.clicks ?? 0);
    const leads = leadsFromActions(r.actions);
    const cid = r.campaign_id ?? r.campaign_name ?? "?";
    return {
      id: `m_${cid}`,
      platform: "meta",
      name: r.campaign_name ?? "",
      invest,
      impr,
      clicks,
      leads,
      oport: 0,
      ganho: 0,
      // Meta retorna ctr como percentual (ex.: 3.66 = 3,66%); normalizamos p/ razão.
      ctr: r.ctr != null ? Number(r.ctr) / 100 : clicks / Math.max(1, impr),
      cpc: r.cpc != null ? Number(r.cpc) : invest / Math.max(1, clicks),
      cpl: invest / Math.max(1, leads),
      cpo: 0,
      cpf: 0,
      txLeadOport: 0,
      txOportGanho: 0,
    };
  });
}

export function buildGoogleCampaigns(resp: GoogleCampaignsResult | null): Campaign[] {
  if (!resp) return [];
  return resp.results.map((row) => {
    const m = row.metrics;
    const invest = m.costMicros / 1_000_000;
    const impr = m.impressions;
    const clicks = m.clicks;
    const leads = Math.trunc(m.conversions);
    return {
      id: `g_${row.campaign.id}`,
      platform: "google",
      name: row.campaign.name,
      invest,
      impr,
      clicks,
      leads,
      oport: 0,
      ganho: 0,
      ctr: m.ctr || clicks / Math.max(1, impr),
      cpc: invest / Math.max(1, clicks),
      cpl: invest / Math.max(1, leads),
      cpo: 0,
      cpf: 0,
      txLeadOport: 0,
      txOportGanho: 0,
    };
  });
}
