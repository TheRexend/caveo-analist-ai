"use client";
import { memo, useMemo } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CalendarRange } from "lucide-react";
import { fmtDate, fmtNum } from "@/lib/format";
import type { DailyFunnelPoint, Platform } from "@/lib/types";

const C_OPORT = "oklch(0.72 0.15 72)"; // âmbar (oportunidades/dia)
const C_GANHO = "oklch(0.45 0.12 280)"; // roxo (fechamentos/dia)

const PLATFORM_LABEL: Record<Platform, string> = { all: "Meta + Google", meta: "Meta", google: "Google" };

function OpportunitiesChartBase({
  days, platform,
}: {
  days: DailyFunnelPoint[];
  platform: Platform;
}) {
  const { data, totalOport, totalGanho } = useMemo(() => {
    const rows = days.map((d) => ({ ...d, label: fmtDate(d.date) }));
    return {
      data: rows,
      totalOport: days.reduce((s, d) => s + d.oport, 0),
      totalGanho: days.reduce((s, d) => s + d.ganho, 0),
    };
  }, [days]);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="section-title"><CalendarRange size={13} /> Oportunidades × Fechamentos por dia</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>
            Oportunidades criadas (barra) e fechamentos ganhos (linha) · {PLATFORM_LABEL[platform]}
          </div>
        </div>
        <div className="legend-chips">
          <span className="legend-chip active" aria-hidden>
            <span className="swatch" style={{ background: C_OPORT }} />
            Oportunidades · {fmtNum(totalOport)}
          </span>
          <span className="legend-chip active" aria-hidden>
            <span className="swatch" style={{ background: C_GANHO }} />
            Fechamentos · {fmtNum(totalGanho)}
          </span>
        </div>
      </div>

      <div className="chart-wrap" role="img" aria-label="Gráfico de oportunidades criadas e fechamentos por dia">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--c-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24}
              tick={{ fontSize: 11, fill: "var(--c-text-muted)" }} />
            <YAxis yAxisId="oport" orientation="left" tickLine={false} axisLine={false} width={40} allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--c-text-muted)" }} tickFormatter={(v) => fmtNum(v as number)} />
            <YAxis yAxisId="ganho" orientation="right" tickLine={false} axisLine={false} width={36} allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--c-text-muted)" }} tickFormatter={(v) => fmtNum(v as number)} />
            <Tooltip
              contentStyle={{ background: "var(--c-tooltip-bg)", border: "none", borderRadius: 8, fontSize: 11, color: "var(--c-tooltip-text)", padding: "9px 11px", boxShadow: "var(--c-shadow-md)" }}
              labelStyle={{ color: "var(--c-tooltip-muted)", marginBottom: 4 }}
              cursor={{ fill: "var(--c-border)", opacity: 0.4 }}
              formatter={(value, name) => [fmtNum(value as number), name === "oport" ? "Oportunidades" : "Fechamentos"]}
            />
            <Bar yAxisId="oport" dataKey="oport" name="oport" fill={C_OPORT} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Line yAxisId="ganho" dataKey="ganho" name="ganho" type="monotone" stroke={C_GANHO} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export const OpportunitiesChart = memo(OpportunitiesChartBase);
