"use client";
import { memo, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { fmtPct } from "@/lib/format";
import type { Metrics } from "@/lib/types";

/** Regra de anomalia: métrica, direção "ruim" e limiar de variação. */
interface Rule {
  key: keyof Metrics;
  label: string;
  bad: "up" | "down";
  threshold: number; // fração (0.25 = 25%)
}

const RULES: Rule[] = [
  { key: "leads", label: "Volume de leads", bad: "down", threshold: 0.25 },
  { key: "cpl", label: "Custo por lead", bad: "up", threshold: 0.25 },
  { key: "oport", label: "Oportunidades", bad: "down", threshold: 0.25 },
  { key: "cpo", label: "Custo por oportunidade", bad: "up", threshold: 0.25 },
  { key: "ganho", label: "Fechamentos", bad: "down", threshold: 0.3 },
  { key: "cpf", label: "Custo por fechamento", bad: "up", threshold: 0.3 },
  { key: "invest", label: "Investimento", bad: "up", threshold: 0.4 },
];

interface Alert {
  label: string;
  delta: number;
}

function AnomalyAlertsBase({ metrics, prev }: { metrics: Metrics | null; prev: Metrics | null }) {
  const alerts = useMemo<Alert[]>(() => {
    if (!metrics || !prev) return [];
    const out: Alert[] = [];
    for (const r of RULES) {
      const cur = Number(metrics[r.key] ?? 0);
      const old = Number(prev[r.key] ?? 0);
      if (!isFinite(old) || old <= 0) continue;
      const delta = (cur - old) / old;
      const isBad = r.bad === "up" ? delta > 0 : delta < 0;
      if (isBad && Math.abs(delta) >= r.threshold) out.push({ label: r.label, delta });
    }
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [metrics, prev]);

  if (alerts.length === 0) return null;

  return (
    <div className="anomaly-bar">
      <span className="anomaly-icon"><AlertTriangle size={14} strokeWidth={2} /></span>
      <span className="anomaly-title">Anomalias vs. período anterior:</span>
      <span className="anomaly-list">
        {alerts.map((a) => (
          <span key={a.label} className="anomaly-chip">
            {a.label} <b className="num">{a.delta > 0 ? "+" : "−"}{fmtPct(Math.abs(a.delta), 0)}</b>
          </span>
        ))}
      </span>
    </div>
  );
}

export const AnomalyAlerts = memo(AnomalyAlertsBase);
