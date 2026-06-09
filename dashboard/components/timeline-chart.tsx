"use client";
import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtBRL, fmtDate, fmtMonth, fmtNum } from "@/lib/format";
import type { Platform, TimelineDay } from "@/lib/types";

type MetricKey = "invest" | "leads" | "oport" | "cpl" | "ganho";

interface SeriesCfg {
  label: string;
  color: string;
  axis: "money" | "count";
  fmt: (v: number) => string;
}

const SERIES: Record<MetricKey, SeriesCfg> = {
  invest: { label: "Investimento", color: "oklch(0.52 0.16 258)", axis: "money", fmt: (v) => fmtBRL(v, { compact: true }) },
  leads: { label: "Leads", color: "oklch(0.60 0.14 148)", axis: "count", fmt: (v) => fmtNum(v) },
  oport: { label: "Oportunidades", color: "oklch(0.72 0.15 72)", axis: "count", fmt: (v) => fmtNum(v) },
  cpl: { label: "CPL", color: "oklch(0.58 0.19 25)", axis: "money", fmt: (v) => fmtBRL(v, { digits: 0 }) },
  ganho: { label: "Fechamentos", color: "oklch(0.45 0.12 280)", axis: "count", fmt: (v) => fmtNum(v) },
};

const ORDER: MetricKey[] = ["invest", "leads", "oport", "cpl", "ganho"];

export function TimelineChart({ days, platform }: { days: TimelineDay[]; platform: Platform }) {
  const [granularity, setGranularity] = useState<"day" | "month">("day");
  const [ma7, setMa7] = useState(false);
  const [active, setActive] = useState<Record<MetricKey, boolean>>({
    invest: true, leads: true, oport: true, cpl: false, ganho: false,
  });

  const data = useMemo(() => {
    const agg = days.map((d) => {
      const p =
        platform === "all"
          ? {
              invest: d.google.invest + d.meta.invest,
              leads: d.google.leads + d.meta.leads,
              oport: d.google.oport + d.meta.oport,
              ganho: d.google.ganho + d.meta.ganho,
            }
          : { invest: d[platform].invest, leads: d[platform].leads, oport: d[platform].oport, ganho: d[platform].ganho };
      return { date: d.date, ...p, cpl: p.invest / Math.max(1, p.leads) };
    });

    let rows = agg;
    if (granularity === "month") {
      const buckets: Record<string, { date: string; invest: number; leads: number; oport: number; ganho: number }> = {};
      for (const r of agg) {
        const key = r.date.slice(0, 7);
        if (!buckets[key]) buckets[key] = { date: key + "-01", invest: 0, leads: 0, oport: 0, ganho: 0 };
        buckets[key].invest += r.invest;
        buckets[key].leads += r.leads;
        buckets[key].oport += r.oport;
        buckets[key].ganho += r.ganho;
      }
      rows = Object.values(buckets).map((b) => ({ ...b, cpl: b.invest / Math.max(1, b.leads) }));
    }

    if (ma7 && granularity === "day") {
      rows = rows.map((r, i) => {
        const out = { ...r };
        ORDER.forEach((key) => {
          const start = Math.max(0, i - 6);
          const slice = rows.slice(start, i + 1).map((x) => x[key] as number);
          out[key] = slice.reduce((a, b) => a + b, 0) / slice.length;
        });
        return out;
      });
    }

    return rows.map((r) => ({ ...r, label: granularity === "day" ? fmtDate(r.date) : fmtMonth(r.date.slice(0, 7)) }));
  }, [days, platform, granularity, ma7]);

  const activeKeys = ORDER.filter((k) => active[k]);
  const hasMoney = activeKeys.some((k) => SERIES[k].axis === "money");
  const hasCount = activeKeys.some((k) => SERIES[k].axis === "count");

  return (
    <div className="timeline-card">
      <div className="timeline-toolbar">
        <div>
          <h3 className="section-title">Evolução temporal</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>Investimento, volumes e custos ao longo do período</div>
        </div>
        <div className="timeline-controls">
          <label className={`toggle ${ma7 ? "on" : ""}`} onClick={() => granularity === "day" && setMa7((v) => !v)} style={{ opacity: granularity === "month" ? 0.4 : 1 }}>
            <span className="toggle-switch" />
            Média 7d
          </label>
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setGranularity((g) => (g === "day" ? "month" : "day"))}>
            {granularity === "day" ? "Diário" : "Mensal"}
          </button>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--c-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tick={{ fontSize: 11, fill: "var(--c-text-muted)" }} />
            {hasMoney && (
              <YAxis yAxisId="money" orientation="left" tickLine={false} axisLine={false} width={56}
                tick={{ fontSize: 11, fill: "var(--c-text-muted)" }} tickFormatter={(v) => fmtBRL(v as number, { compact: true })} />
            )}
            {hasCount && (
              <YAxis yAxisId="count" orientation={hasMoney ? "right" : "left"} tickLine={false} axisLine={false} width={40}
                tick={{ fontSize: 11, fill: "var(--c-text-muted)" }} tickFormatter={(v) => fmtNum(v as number)} />
            )}
            <Tooltip
              contentStyle={{ background: "oklch(0.20 0.01 260)", border: "none", borderRadius: 8, fontSize: 11, color: "#fff", padding: "9px 11px" }}
              labelStyle={{ color: "oklch(0.75 0.01 260)", marginBottom: 4 }}
              formatter={(value, name) => {
                const key = name as MetricKey;
                return [SERIES[key].fmt(value as number), SERIES[key].label];
              }}
            />
            {activeKeys.map((k) => (
              <Line key={k} yAxisId={SERIES[k].axis} dataKey={k} name={k} type="monotone"
                stroke={SERIES[k].color} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="legend-chips" style={{ marginTop: 12 }}>
        {ORDER.map((k) => (
          <button key={k} className={`legend-chip ${active[k] ? "active" : ""}`} onClick={() => setActive((a) => ({ ...a, [k]: !a[k] }))}>
            <span className="swatch" style={{ background: active[k] ? SERIES[k].color : "var(--c-text-faint)" }} />
            {SERIES[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}
