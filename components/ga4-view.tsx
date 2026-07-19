"use client";
import { useEffect, useMemo, useState } from "react";
import { Clock, Globe, MousePointerClick, Target, TrendingUp, UserPlus, Users } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { fetchGA4 } from "@/lib/api-client";
import { fmtNum, fmtPct } from "@/lib/format";
import type { GA4Payload } from "@/lib/types";

/** Segundos → "m min s" (ex.: 142 → "2m22s"). */
function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function GA4View({
  dateFrom, dateTo, refreshKey,
}: { dateFrom: string; dateTo: string; refreshKey: number }) {
  const [data, setData] = useState<GA4Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchGA4(dateFrom, dateTo, false, ctrl.signal)
      .then((d) => { if (!ctrl.signal.aborted) { setData(d); setLoading(false); } })
      .catch(() => { if (!ctrl.signal.aborted) { setData(null); setLoading(false); } });
    return () => ctrl.abort();
  }, [dateFrom, dateTo, refreshKey]);

  const ovp = useMemo(() => {
    if (!data) return { organic: 0, paid: 0, other: 0, total: 0 };
    const { organic, paid, other } = data.organicVsPaid;
    return { organic, paid, other, total: organic + paid + other || 1 };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="loading-shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 10, width: "60%" }} />
            <div className="loading-shimmer" style={{ height: 28, borderRadius: 6, width: "80%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data._mock) {
    return (
      <section className="panel">
        <h3 className="section-title"><Globe size={13} /> Sítio · GA4</h3>
        <div className="section-sub" style={{ marginTop: 8 }}>
          GA4 indisponível — configure a credencial do service account (ver <code>mcps/README.md</code> / <code>GA4_CREDENTIALS</code>).
        </div>
      </section>
    );
  }

  const { overview: o, overviewPrev: p, channels, topPages, landingPages } = data;
  const maxCh = Math.max(1, ...channels.map((c) => c.sessions));

  return (
    <>
      <div className="section-head">
        <div className="section-head-left">
          <h2 className="section-title"><Globe size={14} /> Comportamento no sítio · GA4</h2>
        </div>
        <span className="section-sub">Fonte · Google Analytics 4</span>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Usuários" value={o.users} format="num" icon={Users} previous={p.users} />
        <KpiCard label="Sessões" value={o.sessions} format="num" icon={TrendingUp} previous={p.sessions} />
        <KpiCard label="Novos usuários" value={o.newUsers} format="num" icon={UserPlus} previous={p.newUsers} />
        <KpiCard label="Taxa de engajamento" value={o.engagementRate} format="pct" icon={MousePointerClick} previous={p.engagementRate} />
        <KpiCard label="Conversões (site)" value={o.conversions} format="num" icon={Target} previous={p.conversions} />
        {/* Tempo médio: tile custom (mm:ss) */}
        <div className="kpi-card fade-up">
          <div className="kpi-label"><span>Tempo médio / sessão</span><span className="kpi-icon"><Clock size={13} strokeWidth={1.6} /></span></div>
          <div className="kpi-value-row"><div className="kpi-value num">{fmtDuration(o.avgSessionDuration)}</div></div>
          <div className="kpi-meta"><span className="section-sub num">ant.: {fmtDuration(p.avgSessionDuration)}</span></div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div><h3 className="section-title"><Globe size={13} /> Aquisição por canal</h3></div>
          <span className="section-sub">
            Orgânico <b className="num">{fmtPct(ovp.organic / ovp.total, 0)}</b> ·
            Pago <b className="num">{fmtPct(ovp.paid / ovp.total, 0)}</b> ·
            Outro <b className="num">{fmtPct(ovp.other / ovp.total, 0)}</b>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {channels.map((c) => (
            <div key={c.channel} style={{ display: "grid", gridTemplateColumns: "150px 1fr 70px", alignItems: "center", gap: 10 }}>
              <span className="section-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.channel}</span>
              <span className="ga4-bar-track"><span className="ga4-bar-fill" style={{ width: `${(c.sessions / maxCh) * 100}%` }} /></span>
              <span className="num" style={{ textAlign: "right", fontSize: 12 }}>{fmtNum(c.sessions)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="section-title"><Target size={13} /> Landing pages</h3>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="ga4-table">
            <thead><tr><th>Landing page</th><th>Sessões</th><th>Conversões</th><th>Engaj.</th><th>Tempo méd.</th></tr></thead>
            <tbody>
              {landingPages.length === 0 ? (
                <tr><td colSpan={5} className="section-sub">Sem sessões nas LPs no período.</td></tr>
              ) : landingPages.map((lp) => (
                <tr key={lp.landingPage}>
                  <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lp.landingPage}</td>
                  <td className="num">{fmtNum(lp.sessions)}</td>
                  <td className="num">{fmtNum(lp.conversions)}</td>
                  <td className="num">{fmtPct(lp.engagementRate, 0)}</td>
                  <td className="num">{fmtDuration(lp.avgDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="section-title"><Globe size={13} /> Páginas mais acessadas</h3>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="ga4-table">
            <thead><tr><th>Página</th><th>Visualizações</th></tr></thead>
            <tbody>
              {topPages.map((pg) => (
                <tr key={pg.path}>
                  <td style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.path}</td>
                  <td className="num">{fmtNum(pg.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
