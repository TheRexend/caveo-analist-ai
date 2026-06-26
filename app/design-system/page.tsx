"use client";
import { Fragment, useState, useRef, useEffect } from "react";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  BarChart2, TrendingUp, TrendingDown, Users, DollarSign,
  Target, RefreshCw, Download, Search, Settings, ChevronRight,
  Zap, ArrowRight, Check,
} from "lucide-react";

/* ─── Helpers ──────────────────────────────────────────────── */
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.02, color: "var(--c-text)", margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 13, color: "var(--c-text-muted)", margin: "4px 0 0" }}>{sub}</p>}
      </div>
      <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 22 }}>{children}</div>
    </section>
  );
}

function Row({ label, children, wrap }: { label: string; children: React.ReactNode; wrap?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: wrap ? "flex-start" : "center", gap: 20, marginBottom: 18, flexWrap: wrap ? "wrap" : undefined }}>
      <span style={{ width: 180, flexShrink: 0, fontSize: 12, color: "var(--c-text-faint)", fontFamily: "var(--font-mono)", letterSpacing: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

/* ─── Color Swatch ──────────────────────────────────────────── */
function Swatch({ token, label, dark }: { token: string; label?: string; dark?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 10,
        background: `var(${token})`,
        border: "1px solid var(--c-border)",
        boxShadow: "var(--c-shadow-sm)",
      }} />
      <span style={{ fontSize: 10, color: dark ? "var(--c-text-faint)" : "var(--c-text-muted)", textAlign: "center", maxWidth: 60, lineHeight: 1.3 }}>
        {label ?? token.replace("--c-", "")}
      </span>
    </div>
  );
}

/* ─── Shadow Card ───────────────────────────────────────────── */
function ShadowCard({ shadow, label }: { shadow: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 80, height: 56, borderRadius: 12,
        background: "var(--c-surface)", border: "1px solid var(--c-border)",
        boxShadow: `var(${shadow})`,
        display: "grid", placeItems: "center", margin: "0 auto 8px",
      }} />
      <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{label}</span>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function DesignSystemPage() {
  const [seg, setSeg] = useState<"all" | "meta" | "google">("all");
  const [toggleOn, setToggleOn] = useState(false);
  const [activeChip, setActiveChip] = useState<string[]>(["Investimento", "Leads"]);
  const [expanded, setExpanded] = useState(false);
  const [demoFrom, setDemoFrom] = useState("2026-03-13");
  const [demoTo, setDemoTo] = useState("2026-03-26");

  const toggleChip = (label: string) =>
    setActiveChip((c) => c.includes(label) ? c.filter((x) => x !== label) : [...c, label]);

  return (
    <div style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "40px 48px 80px", fontFamily: "var(--font-sans, sans-serif)" }}>
      {/* Header */}
      <div style={{ marginBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div className="brand-mark">C</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.03, color: "var(--c-text)" }}>Design System</div>
            <div style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 2 }}>Caveo · Analyst AI · tokens, componentes e padrões visuais</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {["Tokens CSS", "Botões", "Status", "Pills", "Segmented", "Date Picker", "KPI Cards", "Funil", "Timeline", "Tabela", "Inputs", "Animações"].map((t) => (
            <a key={t} href={`#${t.toLowerCase().replace(" ", "-")}`}
              style={{ fontSize: 12, color: "var(--c-accent-text)", background: "var(--c-accent-soft)", border: "1px solid oklch(0.82 0.07 258)", borderRadius: 999, padding: "3px 10px", textDecoration: "none" }}>
              {t}
            </a>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100 }}>

        {/* ── 1. Cores ─────────────────────────────────────────── */}
        <Section title="Tokens de Cor" sub="Todas as variáveis --c-* definidas em caveo.css">
          <Row label="Superfícies" wrap>
            <Swatch token="--c-bg" label="bg" />
            <Swatch token="--c-bg-deep" label="bg-deep" />
            <Swatch token="--c-surface" label="surface" />
            <Swatch token="--c-surface-muted" label="surface-muted" />
          </Row>
          <Row label="Bordas" wrap>
            <Swatch token="--c-border" label="border" />
            <Swatch token="--c-border-strong" label="border-strong" />
          </Row>
          <Row label="Texto" wrap>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(["--c-text", "--c-text-muted", "--c-text-faint"] as const).map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: `var(${t})`, border: "1px solid var(--c-border)" }} />
                  <span style={{ fontSize: 13, color: `var(${t})` }}>{t.replace("--c-", "")}</span>
                  <span style={{ fontSize: 11, color: "var(--c-text-faint)", fontFamily: "var(--font-mono)" }}>{t}</span>
                </div>
              ))}
            </div>
          </Row>
          <Row label="Accent (azul)" wrap>
            <Swatch token="--c-accent" label="accent" />
            <Swatch token="--c-accent-soft" label="accent-soft" />
          </Row>
          <Row label="Status" wrap>
            <Swatch token="--c-success" label="success" />
            <Swatch token="--c-success-soft" label="success-soft" />
            <Swatch token="--c-warning" label="warning" />
            <Swatch token="--c-warning-soft" label="warning-soft" />
            <Swatch token="--c-danger" label="danger" />
            <Swatch token="--c-danger-soft" label="danger-soft" />
          </Row>
          <Row label="Plataformas" wrap>
            <Swatch token="--c-google" label="google" />
            <Swatch token="--c-meta" label="meta" />
          </Row>
        </Section>

        {/* ── 2. Tipografia ────────────────────────────────────── */}
        <Section title="Tipografia" sub="Geist Sans (UI) + Geist Mono (números)">
          <div style={{ display: "grid", gap: 18 }}>
            {[
              { label: "Display", style: { fontSize: 32, fontWeight: 700, letterSpacing: -0.03 } },
              { label: "Heading 1", style: { fontSize: 24, fontWeight: 700, letterSpacing: -0.025 } },
              { label: "Heading 2", style: { fontSize: 18, fontWeight: 600, letterSpacing: -0.015 } },
              { label: "Heading 3", style: { fontSize: 15, fontWeight: 600, letterSpacing: -0.01 } },
              { label: "Body (14px)", style: { fontSize: 14, fontWeight: 400 } },
              { label: "Small (13px)", style: { fontSize: 13, fontWeight: 400 } },
              { label: "Caption (12px)", style: { fontSize: 12, color: "var(--c-text-muted)" } },
              { label: "Micro (11px)", style: { fontSize: 11, color: "var(--c-text-faint)", letterSpacing: 0.04 } },
            ].map(({ label, style }) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                <span style={{ width: 140, fontSize: 11, color: "var(--c-text-faint)", flexShrink: 0 }}>{label}</span>
                <span style={{ ...style, color: (style as { color?: string }).color ?? "var(--c-text)" }}>
                  Caveo Analyst AI · performance e resultado
                </span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 8 }}>
              <span style={{ width: 140, fontSize: 11, color: "var(--c-text-faint)", flexShrink: 0 }}>Mono / Tabular</span>
              <span className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.02 }}>
                R$ 124.750 · 3,66% · 217
              </span>
            </div>
          </div>
        </Section>

        {/* ── 3. Raio & Sombras ────────────────────────────────── */}
        <Section title="Raio & Sombras">
          <Row label="Border radius" wrap>
            {[
              { label: "sm — 6px", r: 6 }, { label: "md — 10px", r: 10 },
              { label: "lg — 14px", r: 14 }, { label: "xl — 18px", r: 18 }, { label: "full — 999px", r: 999 },
            ].map(({ label, r }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 52, background: "var(--c-accent-soft)", border: "1px solid var(--c-accent)", borderRadius: r, margin: "0 auto 6px" }} />
                <span style={{ fontSize: 10, color: "var(--c-text-muted)" }}>{label}</span>
              </div>
            ))}
          </Row>
          <Row label="Sombras" wrap>
            <ShadowCard shadow="--c-shadow-sm" label="shadow-sm" />
            <ShadowCard shadow="--c-shadow-md" label="shadow-md" />
            <ShadowCard shadow="--c-shadow-lg" label="shadow-lg" />
          </Row>
        </Section>

        {/* ── 4. Botões ────────────────────────────────────────── */}
        <Section title="Botões" sub=".btn, .btn-primary, .btn-ghost, .btn-icon">
          <Row label="Variantes">
            <button className="btn btn-primary"><Zap size={13} />Primário</button>
            <button className="btn"><Download size={13} />Default</button>
            <button className="btn btn-ghost"><Settings size={13} />Ghost</button>
          </Row>
          <Row label="Com ícone">
            <button className="btn btn-primary"><RefreshCw size={13} />Atualizar</button>
            <button className="btn"><Check size={13} />Salvar metas</button>
            <button className="btn"><Download size={13} />Exportar CSV</button>
          </Row>
          <Row label="Icon-only (.btn-icon)">
            <button className="btn-icon"><RefreshCw size={14} /></button>
            <button className="btn-icon"><Download size={14} /></button>
            <button className="btn-icon"><Settings size={14} /></button>
            <button className="btn-icon"><Search size={14} /></button>
          </Row>
          <Row label="Desabilitado">
            <button className="btn btn-primary" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}><Zap size={13} />Primário</button>
            <button className="btn" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>Default</button>
          </Row>
        </Section>

        {/* ── 5. Status Tags ───────────────────────────────────── */}
        <Section title="Status Tags" sub="Indicadores de meta: .status-tag.status-{good|warn|bad}">
          <Row label="Variantes">
            <span className="status-tag status-good"><span className="dot" />no alvo · meta 400</span>
            <span className="status-tag status-warn"><span className="dot" />atenção · meta R$ 160</span>
            <span className="status-tag status-bad"><span className="dot" />abaixo · meta 28</span>
          </Row>
          <Row label="Progress fill">
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 280 }}>
              {[
                { label: "good (92%)", cls: "good", w: 92 },
                { label: "warn (64%)", cls: "warn", w: 64 },
                { label: "bad (31%)", cls: "bad", w: 31 },
                { label: "neutral (50%)", cls: "neutral", w: 50 },
              ].map(({ label, cls, w }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--c-text-muted)", marginBottom: 4 }}>
                    <span>{label}</span><span className="num">{w}%</span>
                  </div>
                  <div className="kpi-progress-track">
                    <div className={`kpi-progress-fill ${cls}`} style={{ width: w + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── 6. Platform Pills ────────────────────────────────── */}
        <Section title="Platform & Conv Pills" sub=".platform-pill, .conv-pill">
          <Row label="Platform">
            <span className="platform-pill google"><span className="dot" />Google Ads</span>
            <span className="platform-pill meta"><span className="dot" />Meta Ads</span>
            <span className="platform-pill"><span className="dot" style={{ background: "var(--c-text-muted)" }} />Ambos</span>
          </Row>
          <Row label="Conv pill">
            <span className="conv-pill good"><span className="dot" />18,5%</span>
            <span className="conv-pill warn"><span className="dot" />9,2%</span>
            <span className="conv-pill bad"><span className="dot" />4,8%</span>
          </Row>
          <Row label="Legend chips">
            {["Investimento", "Leads", "Oportunidades", "CPL", "Ganhos"].map((c) => (
              <span key={c} className={`legend-chip ${activeChip.includes(c) ? "active" : ""}`} onClick={() => toggleChip(c)}>
                <span className="swatch" style={{ background: activeChip.includes(c) ? "var(--c-accent)" : "var(--c-border-strong)" }} />
                {c}
              </span>
            ))}
          </Row>
        </Section>

        {/* ── 7. Segmented Control ─────────────────────────────── */}
        <Section title="Segmented Control" sub=".seg com .seg-indicator deslizante">
          <Row label="Plataforma">
            <SegControl
              options={[
                { key: "all", label: "Ambos" },
                { key: "meta", label: "Meta", dot: "var(--c-meta)" },
                { key: "google", label: "Google", dot: "var(--c-google)" },
              ]}
              value={seg}
              onChange={(v) => setSeg(v as typeof seg)}
            />
          </Row>
          <Row label="Granularidade">
            <SegControl
              options={[
                { key: "day", label: "Dia" },
                { key: "week", label: "Semana" },
                { key: "month", label: "Mês" },
              ]}
              value="day"
              onChange={() => {}}
            />
          </Row>
          <Row label="Toggle simples">
            <label className={`toggle ${toggleOn ? "on" : ""}`} onClick={() => setToggleOn((v) => !v)} style={{ cursor: "pointer" }}>
              <div className="toggle-switch" />
              MA7 (média móvel 7 dias)
            </label>
          </Row>
        </Section>

        {/* ── 8. KPI Cards ─────────────────────────────────────── */}
        <Section title="KPI Cards" sub=".kpi-card com progress bar e status tag">
          <div className="kpi-grid">
            <div className="kpi-card fade-up">
              <div className="kpi-label"><span>Investimento</span><span className="kpi-icon"><DollarSign size={13} strokeWidth={1.6} /></span></div>
              <div className="kpi-value num">R$ 47.320</div>
              <div className="kpi-progress">
                <div className="kpi-progress-track">
                  <div className="kpi-progress-fill good" style={{ width: "79%" }} />
                </div>
                <div className="kpi-progress-meta"><span><span className="num">79%</span> da meta</span><span className="num">R$ 60k</span></div>
              </div>
            </div>

            <div className="kpi-card fade-up">
              <div className="kpi-label"><span>Leads</span><span className="kpi-icon"><Users size={13} strokeWidth={1.6} /></span></div>
              <div className="kpi-value num">217</div>
              <div className="kpi-meta">
                <span className="status-tag status-warn"><span className="dot" />atenção · meta 400</span>
              </div>
            </div>

            <div className="kpi-card fade-up">
              <div className="kpi-label"><span>CPL</span><span className="kpi-icon"><BarChart2 size={13} strokeWidth={1.6} /></span></div>
              <div className="kpi-value num">R$ 218</div>
              <div className="kpi-meta">
                <span className="status-tag status-bad"><span className="dot" />abaixo · meta R$ 160</span>
              </div>
            </div>

            <div className="kpi-card fade-up">
              <div className="kpi-label"><span>Oportunidades</span><span className="kpi-icon"><Target size={13} strokeWidth={1.6} /></span></div>
              <div className="kpi-value num">52</div>
              <div className="kpi-progress">
                <div className="kpi-progress-track">
                  <div className="kpi-progress-fill warn" style={{ width: "47%" }} />
                </div>
                <div className="kpi-progress-meta"><span><span className="num">47%</span> da meta</span><span className="num">110</span></div>
              </div>
            </div>

            <div className="kpi-card fade-up">
              <div className="kpi-label"><span>Ganhos</span><span className="kpi-icon"><TrendingUp size={13} strokeWidth={1.6} /></span></div>
              <div className="kpi-value num">10</div>
              <div className="kpi-meta">
                <span className="status-tag status-bad"><span className="dot" />abaixo · meta 28</span>
              </div>
            </div>

            <div className="kpi-card fade-up">
              <div className="kpi-label"><span>Tx. Conv. Leads→Oport.</span><span className="kpi-icon"><ArrowRight size={13} strokeWidth={1.6} /></span></div>
              <div className="kpi-value num">23,9%</div>
              <div className="kpi-meta">
                <span className="status-tag status-good"><span className="dot" />no alvo · meta 25%</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 9. Funil ─────────────────────────────────────────── */}
        <Section title="Funil de Conversão" sub=".funnel → .stage, .conv-arrow, .lost-branch">
          <div className="panel">
            <div className="funnel">
              <div className="funnel-row">
                {[
                  { label: "Leads", count: "217", unit: "R$ 218 / un.", bar: "100%" },
                  { label: "Oportunidades", count: "52", unit: "R$ 910 / un.", bar: "24%" },
                  { label: "Em tratamento", count: "28", unit: "—", bar: "13%" },
                  { label: "Proposta", count: "18", unit: "—", bar: "8%" },
                  { label: "Ganhos", count: "10", unit: "R$ 4.732 / un.", bar: "5%" },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "stretch", flex: "1 1 0", minWidth: 0 }}>
                    <div className="stage" style={{ flex: 1 }}>
                      <div className="stage-label">{s.label}</div>
                      <div className="stage-value num">{s.count}</div>
                      <div className="stage-sub">{s.unit}</div>
                      <div className="stage-bar" style={{ width: s.bar }} />
                    </div>
                    {i < arr.length - 1 && (
                      <div className="conv-arrow">
                        <div className="conv-line" />
                        <span className={`conv-pill ${i === 0 ? "good" : i === 1 ? "warn" : "bad"}`}>
                          <span className="dot" />
                          {["24%", "54%", "64%", "56%"][i]}
                        </span>
                        <span className="conv-label">{["leads→op", "op→trat.", "trat→prop", "prop→win"][i]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="lost-branch">
                <div className="lost-connector" />
                <div className="lost-box">
                  <span className="lost-icon"><TrendingDown size={13} /></span>
                  <div>
                    <div className="stage-label">Oportunidades perdidas</div>
                    <div className="stage-value num">18</div>
                  </div>
                  <div style={{ marginLeft: 14, fontSize: 11, color: "var(--c-text-muted)" }}>
                    custo afundado <span className="num" style={{ color: "var(--c-text)", fontWeight: 600 }}>R$ 16.380</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 10. Tabela ───────────────────────────────────────── */}
        <Section title="Tabela de Campanhas" sub=".table-card com .platform-pill, .expander, .expand-content">
          <div className="table-card">
            <div className="table-toolbar">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Campanhas</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="search">
                  <span className="search-icon"><Search size={13} /></span>
                  <input placeholder="Buscar campanha…" readOnly />
                </div>
                <button className="btn"><Download size={13} />CSV</button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="campaigns">
                <thead>
                  <tr>
                    <th className="first">Campanha</th>
                    <th>Plataforma</th>
                    <th>Gasto <span className="sort-ind">↓</span></th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "[LEADS] Caveo · Seguros · Topo", plat: "meta", spend: "R$ 18.240", leads: 94, cpl: "R$ 194", ctr: "3,66%" },
                    { name: "[LEADS] Caveo · Retargeting", plat: "meta", spend: "R$ 9.080", leads: 48, cpl: "R$ 189", ctr: "4,12%" },
                    { name: "Caveo | Marca | Exact", plat: "google", spend: "R$ 12.400", leads: 52, cpl: "R$ 238", ctr: "8,91%" },
                    { name: "Caveo | Não-marca | Seguro Auto", plat: "google", spend: "R$ 8.200", leads: 30, cpl: "R$ 273", ctr: "2,44%" },
                  ].map((row, i) => (
                    <Fragment key={row.name}>
                      <tr className={i === 0 && expanded ? "expanded" : ""} onClick={() => i === 0 && setExpanded((v) => !v)}>
                        <td className="first">
                          <span className="expander"><ChevronRight size={12} /></span>
                          <span style={{ fontSize: 13 }}>{row.name}</span>
                        </td>
                        <td><span className={`platform-pill ${row.plat}`}><span className="dot" />{row.plat === "meta" ? "Meta" : "Google"}</span></td>
                        <td className="num">{row.spend}</td>
                        <td className="num">{row.leads}</td>
                        <td className="num">{row.cpl}</td>
                        <td className="num">{row.ctr}</td>
                      </tr>
                      {i === 0 && (
                        <tr className="expand-row">
                          <td colSpan={6}>
                            <div className={`expand-content ${expanded ? "open" : ""}`}>
                              <div className="expand-inner">
                                {[
                                  { lbl: "Impressões", val: "498.200" },
                                  { lbl: "Cliques", val: "18.234" },
                                  { lbl: "Freq. Média", val: "3,2×" },
                                ].map((m) => (
                                  <div key={m.lbl} className="expand-metric">
                                    <div className="lbl">{m.lbl}</div>
                                    <div className="val num">{m.val}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  <tr className="total-row">
                    <td className="first" colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>R$ 47.920</strong></td>
                    <td className="num"><strong>224</strong></td>
                    <td className="num"><strong>R$ 214</strong></td>
                    <td className="num">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 10 }}>
            Clique na primeira linha para ver o expander em ação.
          </p>
        </Section>

        {/* ── 11. Goal Inputs ──────────────────────────────────── */}
        <Section title="Goal Inputs" sub=".goal-row + .goal-input — usados no dialog de metas">
          <div className="panel" style={{ maxWidth: 520 }}>
            {[
              { name: "Investimento mensal", desc: "Budget total de mídia", prefix: "R$", placeholder: "60.000" },
              { name: "Meta de Leads", desc: "Leads qualificados no período", prefix: "#", placeholder: "400" },
              { name: "CPL alvo", desc: "Custo por lead objetivo", prefix: "R$", placeholder: "160" },
              { name: "Taxa de Conversão", desc: "Leads → Oportunidades", prefix: "%", placeholder: "25" },
            ].map((g) => (
              <div key={g.name} className="goal-row">
                <div className="goal-info">
                  <div className="name">{g.name}</div>
                  <div className="desc">{g.desc}</div>
                </div>
                <div className="goal-input">
                  <span className="prefix">{g.prefix}</span>
                  <input placeholder={g.placeholder} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-primary"><Check size={13} />Salvar metas</button>
            </div>
          </div>
        </Section>

        {/* ── Date Picker ──────────────────────────────────────── */}
        <Section title="Date Range Picker" sub="Seletor de período com presets e calendário — substitui os <input type=date> nativos">
          <Row label="trigger (default)">
            <DateRangePicker
              dateFrom={demoFrom}
              dateTo={demoTo}
              onDates={(f, t) => { setDemoFrom(f); setDemoTo(t); }}
            />
          </Row>
          <Row label="preset ativo">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { from: new Date().toLocaleDateString("sv-SE"), to: new Date().toLocaleDateString("sv-SE") },
                (() => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: d.toLocaleDateString("sv-SE"), to: new Date().toLocaleDateString("sv-SE") }; })(),
                (() => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, to: d.toLocaleDateString("sv-SE") }; })(),
              ].map((range, i) => (
                <DateRangePicker key={i} dateFrom={range.from} dateTo={range.to} onDates={() => {}} />
              ))}
            </div>
          </Row>
          <Row label="anatomia">
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", lineHeight: 1.8, fontFamily: "var(--font-mono)" }}>
              <div><code>drp-trigger</code> — botão com label do preset + intervalo formatado</div>
              <div><code>drp-popup-header</code> — nome do preset | badge com datas</div>
              <div><code>drp-popup-presets</code> — lista de atalhos (Hoje, Ontem…)</div>
              <div><code>drp-popup-cal</code> — calendário shadcn/react-day-picker (mode=range)</div>
              <div><code>drp-popup-footer</code> — fuso horário</div>
            </div>
          </Row>
        </Section>

        {/* ── 12. Animações ────────────────────────────────────── */}
        <Section title="Animações & Estados" sub="fade-up, shimmer, pulse">
          <Row label="fade-up">
            <div className="kpi-card fade-up" style={{ width: 180, padding: "14px 18px" }}>
              <div className="kpi-label"><span>Exemplo</span></div>
              <div className="kpi-value num">1.234</div>
            </div>
          </Row>
          <Row label="shimmer (loading)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 240 }}>
              <div className="loading-shimmer" style={{ height: 18, borderRadius: 6 }} />
              <div className="loading-shimmer" style={{ height: 32, borderRadius: 8 }} />
              <div className="loading-shimmer" style={{ height: 8, borderRadius: 4 }} />
            </div>
          </Row>
          <Row label="refresh-pulse">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--c-text-muted)" }}>
                <span className="refresh-pulse" />ao vivo
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--c-text-muted)" }}>
                <span className="refresh-pulse mock" />mock
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--c-text-muted)" }}>
                <span className="refresh-pulse loading" />carregando
              </span>
            </div>
          </Row>
        </Section>

        {/* ── 13. Panel + Section Head ─────────────────────────── */}
        <Section title="Layout: Panel & Section Head" sub=".panel, .panel-head, .section-head, .section-title">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h3 className="section-title"><BarChart2 size={14} />KPIs de Performance</h3>
            <span className="section-sub">Jun 2026 · Meta + Google</span>
          </div>
          <div className="panel">
            <div className="panel-head">
              <span className="section-title"><Target size={14} />Funil de Conversão</span>
              <button className="btn btn-ghost" style={{ fontSize: 12 }}>Ver detalhe</button>
            </div>
            <div style={{ padding: "8px 0", color: "var(--c-text-muted)", fontSize: 13 }}>
              Conteúdo do painel aqui…
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}

/* ─── Segmented Control (reutilizável) ─────────────────────── */
function SegControl({
  options, value, onChange,
}: {
  options: { key: string; label: string; dot?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const btnsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const activeIdx = options.findIndex((o) => o.key === value);
    const btn = btnsRef.current[activeIdx];
    const indicator = indicatorRef.current;
    if (btn && indicator) {
      indicator.style.left = btn.offsetLeft - 3 + "px";
      indicator.style.width = btn.offsetWidth + "px";
    }
  }, [value, options]);

  return (
    <div className="seg" style={{ position: "relative" }}>
      <div className="seg-indicator" ref={indicatorRef} />
      {options.map((opt, i) => (
        <button
          key={opt.key}
          className="seg-btn"
          aria-pressed={value === opt.key}
          ref={(el) => { btnsRef.current[i] = el; }}
          onClick={() => onChange(opt.key)}
        >
          {opt.dot && <span className="seg-dot" style={{ background: opt.dot }} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
