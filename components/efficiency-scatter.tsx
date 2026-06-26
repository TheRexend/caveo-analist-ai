"use client";
import { memo, useMemo } from "react";
import {
  CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { Crosshair } from "lucide-react";
import { fmtBRL, fmtNum } from "@/lib/format";
import type { Campaign, Platform } from "@/lib/types";

interface Pt { x: number; y: number; z: number; name: string; platform: "meta" | "google" }

function ScatterTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Pt }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="scatter-tip">
      <div className="scatter-tip-name">{p.name}</div>
      <div className="scatter-tip-row"><span>Leads</span><span className="num">{fmtNum(p.x)}</span></div>
      <div className="scatter-tip-row"><span>CPL</span><span className="num">{fmtBRL(p.y, { digits: 0 })}</span></div>
      <div className="scatter-tip-row"><span>Investimento</span><span className="num">{fmtBRL(p.z, { digits: 0 })}</span></div>
    </div>
  );
}

function EfficiencyScatterBase({ campaigns, platform }: { campaigns: Campaign[]; platform: Platform }) {
  const { meta, google, avgCpl } = useMemo(() => {
    const pts: Pt[] = campaigns
      .filter((c) => c.leads > 0 && c.cpl > 0 && (platform === "all" || c.platform === platform))
      .map((c) => ({ x: c.leads, y: c.cpl, z: c.invest, name: c.name, platform: c.platform }));
    const avg = pts.length ? pts.reduce((s, p) => s + p.y, 0) / pts.length : 0;
    return {
      meta: pts.filter((p) => p.platform === "meta"),
      google: pts.filter((p) => p.platform === "google"),
      avgCpl: avg,
    };
  }, [campaigns, platform]);

  if (meta.length + google.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="section-title"><Crosshair size={13} /> Eficiência de campanhas</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>CPL × volume de leads · tamanho da bolha = investimento</div>
        </div>
        <span className="section-sub">↘ mais à direita e abaixo = mais eficiente</span>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 18, top: 10, bottom: 6 }}>
            <CartesianGrid stroke="var(--c-border)" strokeDasharray="3 3" />
            <XAxis
              type="number" dataKey="x" name="Leads" tickLine={false} axisLine={false}
              tickMargin={8} tick={{ fontSize: 11, fill: "var(--c-text-muted)" }}
              tickFormatter={(v) => fmtNum(v as number)}
            />
            <YAxis
              type="number" dataKey="y" name="CPL" tickLine={false} axisLine={false} width={56}
              tick={{ fontSize: 11, fill: "var(--c-text-muted)" }}
              tickFormatter={(v) => fmtBRL(v as number, { compact: true })}
            />
            <ZAxis type="number" dataKey="z" range={[60, 520]} name="Investimento" />
            {avgCpl > 0 && (
              <ReferenceLine
                y={avgCpl} stroke="var(--c-text-faint)" strokeDasharray="4 4"
                label={{ value: `CPL médio ${fmtBRL(avgCpl, { digits: 0 })}`, position: "insideTopRight", fontSize: 10, fill: "var(--c-text-muted)" }}
              />
            )}
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ScatterTip />} />
            <Scatter name="Meta" data={meta} fill="var(--c-meta)" fillOpacity={0.6} />
            <Scatter name="Google" data={google} fill="var(--c-google)" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export const EfficiencyScatter = memo(EfficiencyScatterBase);
