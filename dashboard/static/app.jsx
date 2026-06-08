// === Main App — lê de /api/* com fallback para window.MOCK ===
function App() {
  const [platform, setPlatform] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState(window.MOCK.DEFAULT_FROM);
  const [dateTo,   setDateTo]   = React.useState(window.MOCK.DEFAULT_TO);
  const [search,   setSearch]   = React.useState("");
  const [goalsOpen, setGoalsOpen] = React.useState(false);
  const [goals,    setGoals]    = React.useState(window.MOCK.goals);
  const [dataMode, setDataMode] = React.useState("loading"); // "live" | "mock" | "loading"

  // Dados derivados
  const [k,            setK]            = React.useState(null);
  const [campaigns,    setCampaigns]    = React.useState([]);
  const [timelineDays, setTimelineDays] = React.useState([]);
  const [funnelRaw,    setFunnelRaw]    = React.useState(null); // {lead_novo,no_crm,em_tratamento,proposta,ganho,perdido}

  const mKey       = monthKey(dateTo);
  const monthGoals = goals[mKey] || {};

  // ── Funnel stages derivadas de funnelRaw + goals ──────────────────────────
  const funnelStages = React.useMemo(() => {
    if (!funnelRaw) return [];
    const { lead_novo, no_crm, em_tratamento, proposta, ganho } = funnelRaw;
    return [
      { key: "lead",   label: "Lead Novo",      count: lead_novo,
        unit: (k ? k.invest / Math.max(1, lead_novo) : 0),
        convRate: lead_novo > 0 ? no_crm / lead_novo : null,
        convStatus: lead_novo > 0 ? convStatus(no_crm / lead_novo, [0.15, 0.40]) : null,
        goal: monthGoals.leads },
      { key: "no_crm", label: "Oportunidades",   count: no_crm,
        unit: (k ? k.invest / Math.max(1, no_crm) : 0),
        convRate: no_crm > 0 ? em_tratamento / no_crm : null,
        convStatus: no_crm > 0 ? convStatus(em_tratamento / no_crm, [0.40, 0.70]) : null },
      { key: "trat",   label: "Em Tratamento",  count: em_tratamento,
        unit: (k ? k.invest / Math.max(1, em_tratamento) : 0),
        convRate: em_tratamento > 0 ? proposta / em_tratamento : null,
        convStatus: em_tratamento > 0 ? convStatus(proposta / em_tratamento, [0.02, 0.06]) : null },
      { key: "prop",   label: "Proposta",        count: proposta,
        unit: (k ? k.cpo : 0),
        convRate: no_crm > 0 ? ganho / no_crm : null,
        convStatus: no_crm > 0 ? convStatus(ganho / no_crm, [0.05, 0.15]) : null,
        convLabel: "vs. Oport.",
        goal: monthGoals.oport },
      { key: "ganho",  label: "Fechado Ganho",   count: ganho,
        unit: (k ? k.cpf : 0), goal: monthGoals.ganho },
    ];
  }, [funnelRaw, k, monthGoals]);

  // ── Fallback: calcula tudo de window.MOCK ─────────────────────────────────
  const loadMock = React.useCallback((pf, from, to) => {
    const filtered = window.MOCK.days.filter(d => d.date >= from && d.date <= to);
    const s = { invest: 0, leads: 0, oport: 0, ganho: 0 };
    filtered.forEach(d => {
      const srcs = pf === "all" ? [d.google, d.meta] : [d[pf]];
      srcs.forEach(x => { s.invest += x.invest; s.leads += x.leads; s.oport += x.oport; s.ganho += x.ganho; });
    });
    const kpis = {
      ...s,
      cpl:          s.invest / Math.max(1, s.leads),
      cpo:          s.invest / Math.max(1, s.oport),
      cpf:          s.invest / Math.max(1, s.ganho),
      tx_conv:      s.ganho  / Math.max(1, s.oport),
      oport_perdidas: Math.max(0, Math.round(s.oport * 0.62)),
    };
    const lead_novo     = kpis.leads;
    const no_crm        = Math.round(lead_novo * 0.55);
    const em_tratamento = Math.round(no_crm * 0.45);
    const proposta      = Math.round(em_tratamento * 0.12);
    setK(kpis);
    setFunnelRaw({
      lead_novo, no_crm, em_tratamento, proposta,
      ganho: kpis.ganho, perdido: kpis.oport_perdidas,
    });
    setTimelineDays(filtered);
    const mockCams = window.MOCK.campaigns.filter(c => pf === "all" || c.platform === pf);
    setCampaigns(mockCams);
    setDataMode("mock");
  }, []);

  // ── Fetch live data ───────────────────────────────────────────────────────
  React.useEffect(() => {
    setDataMode("loading");
    const qs = new URLSearchParams({ from: dateFrom, to: dateTo, platform });

    const withTimeout = (p, ms) =>
      Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

    // Dados principais (métricas, funil, timeline) — timeout 20s
    withTimeout(
      Promise.all([
        fetch(`/api/metrics?${qs}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`/api/timeline?${qs}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`/api/funnel?${qs}&month=${mKey}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      ]),
      20000
    ).then(([metrics, timeline, funnel]) => {
      setK(metrics);
      setTimelineDays(timeline);
      setFunnelRaw(funnel);
      setDataMode(metrics._mock ? "mock" : "live");
    }).catch(() => {
      loadMock(platform, dateFrom, dateTo);
    });

    // Campanhas — fetch independente, fallback parcial sem derrubar o resto
    withTimeout(
      fetch(`/api/campaigns?${qs}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      25000
    ).then(cams => {
      setCampaigns(cams);
    }).catch(() => {
      const mockCams = window.MOCK.campaigns.filter(c => platform === "all" || c.platform === platform);
      setCampaigns(mockCams);
    });
  }, [platform, dateFrom, dateTo]);

  // ── Fetch goals ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    fetch(`/api/goals?month=${mKey}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(g => setGoals(prev => ({ ...prev, [mKey]: g })))
      .catch(() => {});
  }, [mKey]);

  // ── Save goals ────────────────────────────────────────────────────────────
  const handleSaveGoals = async (g) => {
    setGoals(prev => ({ ...prev, [mKey]: { ...prev[mKey], ...g } }));
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: mKey, ...g }),
      });
    } catch (_) {}
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!k) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">C</div>
            <div>
              <div className="brand-name">Caveo · Analyst AI</div>
              <div className="brand-sub">carregando dados…</div>
            </div>
          </div>
        </header>
        <main className="main">
          <div className="kpi-grid">
            {Array.from({length: 9}).map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="loading-shimmer" style={{height: 12, borderRadius: 6, marginBottom: 10, width: "60%"}}></div>
                <div className="loading-shimmer" style={{height: 28, borderRadius: 6, width: "80%"}}></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const dayCount = timelineDays.length;
  const modeLabel = dataMode === "live"
    ? "Dados em tempo real via API"
    : dataMode === "mock"
    ? "Dados mockados · configure credenciais para dados reais"
    : "Carregando…";

  return (
    <div className="app">
      <TopBar
        platform={platform}
        onPlatform={setPlatform}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDates={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onOpenGoals={() => setGoalsOpen(true)}
        currentMonthLabel={fmtMonth(mKey).replace(" de ", "/")}
        dataMode={dataMode}
      />

      <main className="main">
        {/* KPI Grid */}
        <div className="section-head">
          <h2 className="section-title">
            <Icon name="target" size={14} /> Visão geral · {dayCount} dias do funil
          </h2>
          <span className="section-sub">{modeLabel}</span>
        </div>

        <div className="kpi-grid">
          <KpiCard label="Investimento total"    value={k.invest}         format="brl" icon="wallet"  goal={monthGoals.invest}         goalType="max" hasProgress fullBrl />
          <KpiCard label="Volume de leads"       value={k.leads}          format="num" icon="users"   goal={monthGoals.leads}          goalType="min" hasProgress />
          <KpiCard label="Custo por lead"        value={k.cpl}            format="brl" icon="coin"    goal={monthGoals.cpl}            goalType="max" />
          <KpiCard label="Oportunidades"         value={k.oport}          format="num" icon="funnel"  goal={monthGoals.oport}          goalType="min" hasProgress />
          <KpiCard label="Custo por oportunidade"value={k.cpo}            format="brl" icon="coin"    goal={monthGoals.cpo}            goalType="max" />
          <KpiCard label="Tx. conv. Oport→Ganho" value={k.tx_conv}        format="pct" icon="repeat"  goal={monthGoals.tx_conv}        goalType="min" />
          <KpiCard label="Fechamentos · Ganho"   value={k.ganho}          format="num" icon="trophy"  goal={monthGoals.ganho}          goalType="min" hasProgress />
          <KpiCard label="Custo por fechamento"  value={k.cpf}            format="brl" icon="coin"    goal={monthGoals.cpf}            goalType="max" />
          <KpiCard label="Oportunidades perdidas"value={k.oport_perdidas} format="num" icon="decline" goal={monthGoals.oport_perdidas} goalType="max" />
        </div>

        {/* Funnel */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3 className="section-title"><Icon name="funnel" size={13} /> Funil de conversão</h3>
              <div className="section-sub" style={{ marginTop: 3 }}>
                Fluxo Lead Novo → No CRM → Em Tratamento → Proposta → Fechado Ganho · taxas com semáforo de benchmark
              </div>
            </div>
            <span className="section-sub">Fonte · Salesforce + UTM por plataforma</span>
          </div>
          <Funnel stages={funnelStages} lost={k.oport_perdidas} totalInvest={k.invest} />
        </section>

        {/* Timeline */}
        <Timeline days={timelineDays} platform={platform} />

        {/* Campanhas */}
        <CampaignsTable
          rows={campaigns}
          platform={platform}
          search={search}
          onSearch={setSearch}
        />

        <footer style={{ textAlign: "center", padding: "10px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
          {dataMode === "live" ? "Dashboard ao vivo · porta :8765" : "Dashboard local · dados mockados"} · Caveo Analyst AI
        </footer>
      </main>

      <GoalsModal
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        monthKey={mKey}
        goals={monthGoals}
        onSave={handleSaveGoals}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
