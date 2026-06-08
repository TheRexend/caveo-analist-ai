// === Mock data simulando respostas dos MCPs (Meta Ads + Google Ads + Salesforce) ===
window.MOCK = (function () {
  // Geração determinística de dados de timeline diário
  function rand(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function genDays(from, to) {
    const start = new Date(from);
    const end = new Date(to);
    const days = [];
    let i = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const weekendFactor = isWeekend ? 0.55 : 1.05;
      const seed = d.getTime() / 86400000;
      const noise = 0.7 + rand(seed) * 0.6;
      const trend = 1 + i * 0.005;

      const investGoogle = 1100 * weekendFactor * noise * trend;
      const investMeta = 850 * weekendFactor * noise * trend;
      const leadsGoogle = Math.round(7 * weekendFactor * (0.8 + rand(seed + 1) * 0.5) * trend);
      const leadsMeta = Math.round(5 * weekendFactor * (0.8 + rand(seed + 2) * 0.5) * trend);
      const oportGoogle = Math.round(leadsGoogle * (0.25 + rand(seed + 3) * 0.1));
      const oportMeta = Math.round(leadsMeta * (0.20 + rand(seed + 4) * 0.1));
      const ganhoGoogle = Math.round(oportGoogle * (0.20 + rand(seed + 5) * 0.12));
      const ganhoMeta = Math.round(oportMeta * (0.18 + rand(seed + 6) * 0.10));

      days.push({
        date: d.toISOString().slice(0, 10),
        google: {
          invest: Math.round(investGoogle * 100) / 100,
          leads: leadsGoogle,
          oport: oportGoogle,
          ganho: ganhoGoogle,
          impressions: Math.round(investGoogle * 38),
          clicks: Math.round(investGoogle * 0.9)
        },
        meta: {
          invest: Math.round(investMeta * 100) / 100,
          leads: leadsMeta,
          oport: oportMeta,
          ganho: ganhoMeta,
          impressions: Math.round(investMeta * 62),
          clicks: Math.round(investMeta * 1.4)
        }
      });
      i++;
    }
    return days;
  }

  const DEFAULT_FROM = "2026-05-01";
  const DEFAULT_TO = "2026-05-25";
  const days = genDays(DEFAULT_FROM, DEFAULT_TO);

  const campaigns = [
    { id: "g1", platform: "google", name: "[LEADS] Search · Marca + Termos Quentes", invest: 9840, impr: 142300, clicks: 6420, leads: 78, oport: 24, ganho: 6 },
    { id: "g2", platform: "google", name: "[LEADS] PMax · Cobertura Geral",            invest: 7210, impr: 198400, clicks: 4180, leads: 52, oport: 15, ganho: 3 },
    { id: "g3", platform: "google", name: "[LEADS] Search · Concorrentes",              invest: 4380, impr:  62100, clicks: 2890, leads: 28, oport:  6, ganho: 1 },
    { id: "g4", platform: "google", name: "[LEADS] Display · Remarketing",              invest: 1920, impr: 312000, clicks: 1180, leads: 11, oport:  3, ganho: 1 },
    { id: "m1", platform: "meta",   name: "[LEADS] ABO · Advantage+ Top of Funnel",     invest: 8120, impr: 482100, clicks: 9320, leads: 64, oport: 17, ganho: 4 },
    { id: "m2", platform: "meta",   name: "[LEADS] CBO · Lookalike 1% Compradores",     invest: 5640, impr: 298400, clicks: 5840, leads: 41, oport: 11, ganho: 2 },
    { id: "m3", platform: "meta",   name: "[LEADS] Retargeting · 90d Engaged",          invest: 2780, impr: 132100, clicks: 4210, leads: 24, oport:  7, ganho: 1 },
    { id: "m4", platform: "meta",   name: "[LEADS] Advantage+ Reels Verticais",         invest: 3990, impr: 612400, clicks: 3120, leads: 14, oport:  4, ganho: 0 }
  ];
  // Compute derived per-campaign
  campaigns.forEach(c => {
    c.ctr = c.clicks / c.impr;
    c.cpc = c.invest / c.clicks;
    c.cpl = c.invest / Math.max(1, c.leads);
    c.cpo = c.invest / Math.max(1, c.oport);
    c.cpf = c.invest / Math.max(1, c.ganho);
    c.txLeadOport = c.oport / Math.max(1, c.leads);
    c.txOportGanho = c.ganho / Math.max(1, c.oport);
  });

  // Default goals (current month)
  const goals = {
    "2026-05": {
      invest: 60000,
      leads: 400,
      cpl: 160,
      oport: 110,
      cpo: 560,
      tx_conv: 0.25,
      ganho: 28,
      cpf: 2200,
      oport_perdidas: 50
    }
  };

  return {
    days,
    campaigns,
    goals,
    DEFAULT_FROM,
    DEFAULT_TO
  };
})();
