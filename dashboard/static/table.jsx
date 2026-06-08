// === Campaigns Table ===
function CampaignsTable({ rows, platform, search, onSearch }) {
  const [sort, setSort] = React.useState({ col: "invest", dir: "desc" });
  const [expanded, setExpanded] = React.useState(null);

  const filtered = React.useMemo(() => {
    let r = rows;
    if (platform !== "all") r = r.filter(c => c.platform === platform);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c => c.name.toLowerCase().includes(q));
    }
    const sorted = [...r].sort((a, b) => {
      const va = a[sort.col], vb = b[sort.col];
      if (typeof va === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return sorted;
  }, [rows, platform, search, sort]);

  const toggleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });
  };

  const totals = React.useMemo(() => {
    const t = { invest: 0, impr: 0, clicks: 0, leads: 0, oport: 0, ganho: 0 };
    filtered.forEach(c => { t.invest += c.invest; t.impr += c.impr; t.clicks += c.clicks; t.leads += c.leads; t.oport += c.oport; t.ganho += c.ganho; });
    t.ctr = t.clicks / Math.max(1, t.impr);
    t.cpc = t.invest / Math.max(1, t.clicks);
    t.cpl = t.invest / Math.max(1, t.leads);
    t.cpo = t.invest / Math.max(1, t.oport);
    return t;
  }, [filtered]);

  const cols = [
    { key: "platform", label: "Plataforma", align: "left", first: true },
    { key: "name", label: "Campanha", align: "left" },
    { key: "invest", label: "Investimento" },
    { key: "impr", label: "Impressões" },
    { key: "clicks", label: "Cliques" },
    { key: "ctr", label: "CTR" },
    { key: "cpc", label: "CPC" },
    { key: "leads", label: "Leads" },
    { key: "cpl", label: "CPL" },
    { key: "oport", label: "Oport." },
    { key: "cpo", label: "Custo / Oport." },
    { key: "ganho", label: "Fechamentos" }
  ];

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div>
          <h3 className="section-title">
            <Icon name="filter" size={13} />
            Campanhas de mídia paga
          </h3>
          <div className="section-sub" style={{ marginTop: 3 }}>
            {filtered.length} campanha{filtered.length === 1 ? "" : "s"} · período selecionado
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="search">
            <span className="search-icon"><Icon name="search" size={14} /></span>
            <input
              type="text"
              placeholder="Buscar campanha..."
              value={search}
              onChange={e => onSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" title="Exportar CSV">
            <Icon name="download" size={14} />
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="campaigns">
          <thead>
            <tr>
              {cols.map(c => (
                <th
                  key={c.key}
                  className={`${c.first ? "first" : ""} ${sort.col === c.key ? "sorted" : ""}`}
                  style={{ textAlign: c.align || "right" }}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  <span className="sort-ind">{sort.dir === "asc" ? "↑" : "↓"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <React.Fragment key={c.id}>
                <tr
                  className={expanded === c.id ? "expanded" : ""}
                  onClick={() => setExpanded(e => e === c.id ? null : c.id)}
                >
                  <td className="first">
                    <span className="expander"><Icon name="chevron" size={12} /></span>
                    <span className={`platform-pill ${c.platform}`}>
                      <span className="dot"></span>
                      {c.platform === "google" ? "Google" : "Meta"}
                    </span>
                  </td>
                  <td style={{ textAlign: "left", fontWeight: 500 }}>{c.name}</td>
                  <td className="num">{fmtBRL(c.invest)}</td>
                  <td className="num">{fmtNum(c.impr)}</td>
                  <td className="num">{fmtNum(c.clicks)}</td>
                  <td className="num">{fmtPct(c.ctr, 2)}</td>
                  <td className="num">{fmtBRL(c.cpc, { digits: 2 })}</td>
                  <td className="num">{fmtNum(c.leads)}</td>
                  <td className="num">{fmtBRL(c.cpl, { digits: 0 })}</td>
                  <td className="num">{fmtNum(c.oport)}</td>
                  <td className="num">{fmtBRL(c.cpo, { digits: 0 })}</td>
                  <td className="num">{fmtNum(c.ganho)}</td>
                </tr>
                <tr className="expand-row">
                  <td colSpan={cols.length}>
                    <div className={`expand-content ${expanded === c.id ? "open" : ""}`}>
                      <div className="expand-inner">
                        <div className="expand-metric">
                          <div className="lbl">Investimento diário médio</div>
                          <div className="val num">{fmtBRL(c.invest / 25, { digits: 0 })}</div>
                        </div>
                        <div className="expand-metric">
                          <div className="lbl">Tx Lead → Oportunidade</div>
                          <div className="val num">{fmtPct(c.txLeadOport, 1)}</div>
                        </div>
                        <div className="expand-metric">
                          <div className="lbl">Tx Oportunidade → Ganho</div>
                          <div className="val num">{fmtPct(c.txOportGanho, 1)}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={cols.length} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  Nenhuma campanha encontrada para o filtro atual.
                </td>
              </tr>
            )}

            {filtered.length > 0 && (
              <tr className="total-row">
                <td className="first">—</td>
                <td style={{ textAlign: "left" }}>TOTAL · {filtered.length} campanhas</td>
                <td className="num">{fmtBRL(totals.invest)}</td>
                <td className="num">{fmtNum(totals.impr)}</td>
                <td className="num">{fmtNum(totals.clicks)}</td>
                <td className="num">{fmtPct(totals.ctr, 2)}</td>
                <td className="num">{fmtBRL(totals.cpc, { digits: 2 })}</td>
                <td className="num">{fmtNum(totals.leads)}</td>
                <td className="num">{fmtBRL(totals.cpl, { digits: 0 })}</td>
                <td className="num">{fmtNum(totals.oport)}</td>
                <td className="num">{fmtBRL(totals.cpo, { digits: 0 })}</td>
                <td className="num">{fmtNum(totals.ganho)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

Object.assign(window, { CampaignsTable });
