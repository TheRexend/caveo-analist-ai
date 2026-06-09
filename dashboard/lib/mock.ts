// === Dados mock (fallback, port de _mock_days / MOCK_CAMPAIGNS) ===
import type { Campaign, TimelineDay, Platform } from "@/lib/types";

function mockDays(dateFrom: string, dateTo: string): TimelineDay[] {
  const start = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");
  const days: TimelineDay[] = [];
  let i = 0;
  const epoch = new Date("2000-01-01T00:00:00").getTime();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const wf = dow === 0 || dow === 6 ? 0.55 : 1.05;
    const seed = Math.round((d.getTime() - epoch) / 86_400_000);
    const noise = 0.7 + Math.abs(Math.sin(seed * 1.7)) * 0.6;
    const trend = 1 + i * 0.005;
    const ig = 1100 * wf * noise * trend;
    const im = 850 * wf * noise * trend;
    const lg = Math.max(1, Math.round(7 * wf * (0.8 + Math.abs(Math.sin(seed * 3.1)) * 0.5) * trend));
    const lm = Math.max(1, Math.round(5 * wf * (0.8 + Math.abs(Math.sin(seed * 2.3)) * 0.5) * trend));
    const og = Math.max(0, Math.round(lg * (0.25 + Math.abs(Math.sin(seed * 4.1)) * 0.1)));
    const om = Math.max(0, Math.round(lm * (0.2 + Math.abs(Math.sin(seed * 5.2)) * 0.1)));
    const gg = Math.max(0, Math.round(og * (0.2 + Math.abs(Math.sin(seed * 6.3)) * 0.12)));
    const gm = Math.max(0, Math.round(om * (0.18 + Math.abs(Math.sin(seed * 7.4)) * 0.1)));
    days.push({
      date: d.toISOString().slice(0, 10),
      google: { invest: Math.round(ig * 100) / 100, leads: lg, oport: og, ganho: gg, impressions: Math.round(ig * 38), clicks: Math.round(ig * 0.9) },
      meta: { invest: Math.round(im * 100) / 100, leads: lm, oport: om, ganho: gm, impressions: Math.round(im * 62), clicks: Math.round(im * 1.4) },
    });
    i++;
  }
  return days;
}

const MOCK_CAMPAIGNS_RAW: Omit<Campaign, "ctr" | "cpc" | "cpl" | "cpo" | "cpf" | "txLeadOport" | "txOportGanho">[] = [
  { id: "g1", platform: "google", name: "[LEADS] Search · Marca + Termos Quentes", invest: 9840, impr: 142300, clicks: 6420, leads: 78, oport: 24, ganho: 6 },
  { id: "g2", platform: "google", name: "[LEADS] PMax · Cobertura Geral", invest: 7210, impr: 198400, clicks: 4180, leads: 52, oport: 15, ganho: 3 },
  { id: "g3", platform: "google", name: "[LEADS] Search · Concorrentes", invest: 4380, impr: 62100, clicks: 2890, leads: 28, oport: 6, ganho: 1 },
  { id: "g4", platform: "google", name: "[LEADS] Display · Remarketing", invest: 1920, impr: 312000, clicks: 1180, leads: 11, oport: 3, ganho: 1 },
  { id: "m1", platform: "meta", name: "[LEADS] ABO · Advantage+ Top of Funnel", invest: 8120, impr: 482100, clicks: 9320, leads: 64, oport: 17, ganho: 4 },
  { id: "m2", platform: "meta", name: "[LEADS] CBO · Lookalike 1% Compradores", invest: 5640, impr: 298400, clicks: 5840, leads: 41, oport: 11, ganho: 2 },
  { id: "m3", platform: "meta", name: "[LEADS] Retargeting · 90d Engaged", invest: 2780, impr: 132100, clicks: 4210, leads: 24, oport: 7, ganho: 1 },
  { id: "m4", platform: "meta", name: "[LEADS] Advantage+ Reels Verticais", invest: 3990, impr: 612400, clicks: 3120, leads: 14, oport: 4, ganho: 0 },
];

export function mockCampaigns(platform: Platform): Campaign[] {
  return MOCK_CAMPAIGNS_RAW.filter((c) => platform === "all" || c.platform === platform).map((c) => ({
    ...c,
    ctr: c.clicks / Math.max(1, c.impr),
    cpc: c.invest / Math.max(1, c.clicks),
    cpl: c.invest / Math.max(1, c.leads),
    cpo: c.invest / Math.max(1, c.oport),
    cpf: c.invest / Math.max(1, c.ganho),
    txLeadOport: c.oport / Math.max(1, c.leads),
    txOportGanho: c.ganho / Math.max(1, c.oport),
  }));
}

export function aggMock(days: TimelineDay[], platform: Platform) {
  const s = { invest: 0, leads: 0, oport: 0, ganho: 0 };
  for (const d of days) {
    const srcs = platform === "all" ? [d.google, d.meta] : [d[platform]];
    for (const x of srcs) {
      s.invest += x.invest;
      s.leads += x.leads;
      s.oport += x.oport;
      s.ganho += x.ganho;
    }
  }
  return s;
}

export { mockDays };
