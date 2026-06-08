// === Top Bar ===
function TopBar({ platform, onPlatform, dateFrom, dateTo, onDates, onOpenGoals, currentMonthLabel }) {
  const segRef = React.useRef(null);
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });

  React.useLayoutEffect(() => {
    if (!segRef.current) return;
    const el = segRef.current.querySelector(`[data-val="${platform}"]`);
    if (el) {
      const parent = segRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setIndicator({ left: r.left - parent.left, width: r.width });
    }
  }, [platform]);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div>
          <div className="brand-name">Caveo · Analyst AI</div>
          <div className="brand-sub">
            <span className="refresh-pulse"></span>
            sincronizado · há 4 min
          </div>
        </div>
      </div>

      <div className="topbar-controls">
        <div className="seg" ref={segRef} role="tablist" aria-label="Filtro de plataforma">
          <span className="seg-indicator" style={{ left: indicator.left, width: indicator.width }}></span>
          <button className="seg-btn" data-val="all" aria-pressed={platform === "all"} onClick={() => onPlatform("all")}>
            Todas
          </button>
          <button className="seg-btn" data-val="google" aria-pressed={platform === "google"} onClick={() => onPlatform("google")}>
            <span className="seg-dot" style={{ background: "var(--google)" }}></span>
            Google Ads
          </button>
          <button className="seg-btn" data-val="meta" aria-pressed={platform === "meta"} onClick={() => onPlatform("meta")}>
            <span className="seg-dot" style={{ background: "var(--meta)" }}></span>
            Meta Ads
          </button>
        </div>

        <div className="date-range" style={{ borderWidth: "1px 1px 1px 10px", gap: "2px", padding: "3px", margin: "0px", height: "37px", width: "313px" }}>
          <Icon name="calendar" size={14} />
          <input className="date-input" type="date" value={dateFrom} onChange={(e) => onDates(e.target.value, dateTo)} />
          <span className="date-sep">→</span>
          <input className="date-input" type="date" value={dateTo} onChange={(e) => onDates(dateFrom, e.target.value)} />
        </div>

        <button className="btn" onClick={onOpenGoals}>
          <Icon name="settings" size={14} />
          Metas de {currentMonthLabel}
        </button>

        <button className="btn-icon" title="Atualizar dados">
          <Icon name="refresh" size={15} />
        </button>
      </div>
    </header>);

}

// === KPI Card ===
function KpiCard({ label, value, format, unit, icon, goal, goalType, hasProgress, sub, fullBrl }) {
  const animated = useCountUp(value, { duration: 700 });
  const status = goal != null ? statusFromGoal(value, goal, goalType) : "neutral";
  const pct = goal ? Math.min(1.5, value / goal) : 0;
  const fillWidth = goal ? Math.min(100, value / goal * 100) : 0;

  let formatted;
  if (format === "brl") formatted = fmtBRL(animated, { compact: !fullBrl && animated > 9999, digits: fullBrl ? 2 : 0 });else
  if (format === "pct") formatted = fmtPct(animated, 1);else
  formatted = fmtNum(Math.round(animated));

  const statusLabel = status === "good" ? "no alvo" : status === "warn" ? "atenção" : status === "bad" ? "abaixo" : null;

  return (
    <div className="kpi-card fade-up">
      <div className="kpi-label">
        <span>{label}</span>
        <span className="kpi-icon"><Icon name={icon} size={13} /></span>
      </div>
      <div className="kpi-value num">
        {formatted}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>

      {hasProgress && goal != null ?
      <div className="kpi-progress">
          <div className="kpi-progress-track">
            <div className={`kpi-progress-fill ${status}`} style={{ width: fillWidth + "%" }}></div>
          </div>
          <div className="kpi-progress-meta">
            <span>
              <span className="num">{Math.round(pct * 100)}%</span> da meta
            </span>
            <span className="num">
              {format === "brl" ? fmtBRL(goal, { compact: !fullBrl }) : fmtNum(goal)}
            </span>
          </div>
        </div> :
      goal != null ?
      <div className="kpi-meta">
          <span className={`status-tag status-${status}`}>
            <span className="dot"></span>{statusLabel} · meta {format === "brl" ? fmtBRL(goal, { compact: !fullBrl }) : format === "pct" ? fmtPct(goal, 0) : fmtNum(goal)}
          </span>
          {sub ? <span className="num">{sub}</span> : null}
        </div> :

      <div className="kpi-meta">
          {sub ? <span>{sub}</span> : <span>&nbsp;</span>}
        </div>
      }
    </div>);

}

// === Funnel ===
function Funnel({ stages, lost, totalInvest }) {
  const [hovered, setHovered] = React.useState(null);
  const max = Math.max(...stages.map((s) => s.count));

  return (
    <div className="funnel">
      <div className="funnel-row" onMouseLeave={() => setHovered(null)}>
        {stages.map((s, i) =>
        <React.Fragment key={s.key}>
            <div
            className="stage"
            onMouseEnter={(e) => setHovered({ stage: s, x: e.currentTarget.offsetLeft + e.currentTarget.offsetWidth / 2, y: e.currentTarget.offsetTop })}>
            
              <div className="stage-label">{s.label}</div>
              <div className="stage-value num">{fmtNum(s.count)}</div>
              <div className="stage-sub">
                {s.unit ? fmtBRL(s.unit, { compact: false, digits: 0 }) + " / un." : "\u00A0"}
              </div>
              <div className="stage-bar" style={{ width: (s.count / max * 100).toFixed(1) + "%" }}></div>
            </div>
            {i < stages.length - 1 &&
          <div className="conv-arrow">
                <div className="conv-line"></div>
                {s.convRate != null
                  ? <span className={`conv-pill ${s.convStatus}`}>
                      <span className="dot"></span>
                      {fmtPct(s.convRate, 1)}
                    </span>
                  : <span className="conv-pill" style={{ color: "var(--text-faint)", background: "none", border: "none" }}>—</span>
                }
                {s.convLabel &&
              <span style={{ position: "absolute", top: "calc(50% + 16px)", fontSize: 9, color: "var(--text-faint)", whiteSpace: "nowrap", fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                    {s.convLabel}
                  </span>
              }
              </div>
          }
          </React.Fragment>
        )}

        {hovered &&
        <div className="tooltip show" style={{ left: hovered.x, top: hovered.y - 12, transform: "translate(-50%, -100%)" }}>
            <div className="tooltip-row"><span className="k">Custo / unidade</span><span className="v">{fmtBRL(hovered.stage.unit || 0)}</span></div>
            <div className="tooltip-row"><span className="k">% do funil</span><span className="v">{fmtPct(hovered.stage.count / stages[0].count, 1)}</span></div>
            {hovered.stage.goal &&
          <div className="tooltip-row"><span className="k">% da meta</span><span className="v">{Math.round(hovered.stage.count / hovered.stage.goal * 100)}%</span></div>
          }
          </div>
        }
      </div>

      <div className="lost-branch">
        <div className="lost-connector"></div>
        <div className="lost-box">
          <span className="kpi-icon" style={{ background: "oklch(0.94 0.05 25)", color: "oklch(0.45 0.16 25)" }}>
            <Icon name="decline" size={13} />
          </span>
          <div>
            <div className="stage-label">Oportunidades perdidas</div>
            <div className="stage-value num">{fmtNum(lost)}</div>
          </div>
          <div style={{ marginLeft: 14, fontSize: 11, color: "var(--text-muted)" }}>
            ramificação descendente · custo afundado{" "}
            <span className="num" style={{ color: "var(--text)", fontWeight: 600 }}>
              {fmtBRL(lost * (totalInvest / Math.max(1, stages[1].count)))}
            </span>
          </div>
        </div>
      </div>
    </div>);

}

// === Goals Modal ===
function GoalsModal({ open, onClose, monthKey, goals, onSave }) {
  const [draft, setDraft] = React.useState({});

  React.useEffect(() => {
    if (open) setDraft({ ...goals });
  }, [open, goals]);

  const metrics = [
  { slug: "invest", name: "Investimento Total", desc: "Budget máximo do mês", prefix: "R$", type: "max" },
  { slug: "leads", name: "Volume de Leads", desc: "Mínimo de conversões", prefix: "", type: "min" },
  { slug: "cpl", name: "Custo por Lead (CPL)", desc: "Teto aceitável", prefix: "R$", type: "max" },
  { slug: "oport", name: "Oportunidades", desc: "Volume mínimo", prefix: "", type: "min" },
  { slug: "cpo", name: "Custo por Oportunidade", desc: "Teto aceitável", prefix: "R$", type: "max" },
  { slug: "tx_conv", name: "Tx Conv. Oport→Ganho", desc: "Mínimo, em %", prefix: "%", type: "min" },
  { slug: "ganho", name: "Fechamentos (Ganho)", desc: "Volume mínimo", prefix: "", type: "min" },
  { slug: "cpf", name: "Custo por Fechamento", desc: "Teto aceitável", prefix: "R$", type: "max" },
  { slug: "oport_perdidas", name: "Oportunidades Perdidas", desc: "Teto aceitável", prefix: "", type: "max" }];


  const update = (slug, val) => {
    setDraft((d) => ({ ...d, [slug]: val === "" ? null : parseFloat(val) }));
  };

  return (
    <div className={`modal-backdrop ${open ? "open" : ""}`} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">Metas de {fmtMonth(monthKey)}</h3>
            <div className="modal-sub">As metas configuradas alimentam as barras de progresso e os semáforos dos KPIs.</div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="modal-body">
          {metrics.map((m) =>
          <div className="goal-row" key={m.slug}>
              <div className="goal-info">
                <div className="name">{m.name}</div>
                <div className="desc">{m.desc}</div>
              </div>
              <div className="goal-input">
                {m.prefix && m.prefix !== "%" ? <span className="prefix">{m.prefix}</span> : null}
                <input
                type="number"
                step="any"
                value={draft[m.slug] ?? ""}
                placeholder="—"
                onChange={(e) => update(m.slug, e.target.value)} />
              
                {m.prefix === "%" ? <span className="prefix" style={{ paddingRight: 10, paddingLeft: 0 }}>%</span> : null}
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {onSave(draft);onClose();}}>
            <Icon name="check" size={14} />
            Salvar metas
          </button>
        </div>
      </div>
    </div>);

}

Object.assign(window, { TopBar, KpiCard, Funnel, GoalsModal });