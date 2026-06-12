"use client";
import { memo, useEffect, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import { fetchMetrics } from "@/lib/api-client";
import { fmtBRL, fmtNum } from "@/lib/format";
import type { Metrics } from "@/lib/types";

type Row = { key: keyof Metrics; label: string; fmt: (v: number) => string; lowerBetter?: boolean };

const ROWS: Row[] = [
  { key: "invest", label: "Investimento", fmt: (v) => fmtBRL(v, { compact: true }) },
  { key: "leads", label: "Leads", fmt: (v) => fmtNum(v) },
  { key: "cpl", label: "CPL", fmt: (v) => fmtBRL(v, { digits: 0 }), lowerBetter: true },
  { key: "oport", label: "Oportunidades", fmt: (v) => fmtNum(v) },
  { key: "ganho", label: "Fechamentos", fmt: (v) => fmtNum(v) },
];

function Bar({ side, value, max, label }: { side: "meta" | "google"; value: number; max: number; label: string }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className={`cmp-bar ${side}`}>
      <div className="cmp-bar-track">
        <div className="cmp-bar-fill" style={{ width: w + "%" }} />
      </div>
      <span className="cmp-bar-val num">{label}</span>
    </div>
  );
}

function PlatformCompareBase({ from, to }: { from: string; to: string }) {
  const [meta, setMeta] = useState<Metrics | null>(null);
  const [google, setGoogle] = useState<Metrics | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchMetrics("meta", from, to, ctrl.signal),
      fetchMetrics("google", from, to, ctrl.signal),
    ])
      .then(([m, g]) => {
        setMeta(m);
        setGoogle(g);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [from, to]);

  if (!meta || !google) {
    return (
      <section className="panel">
        <div className="loading-shimmer" style={{ height: 140, borderRadius: 10 }} />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="section-title"><GitCompareArrows size={13} /> Meta × Google</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>Comparativo por plataforma no período selecionado</div>
        </div>
        <div className="cmp-legend">
          <span><span className="cmp-dot meta" /> Meta</span>
          <span><span className="cmp-dot google" /> Google</span>
        </div>
      </div>

      <div className="cmp-grid">
        {ROWS.map((r) => {
          const mv = (meta[r.key] as number) ?? 0;
          const gv = (google[r.key] as number) ?? 0;
          const max = Math.max(mv, gv);
          const winner = mv === gv ? null : r.lowerBetter ? (mv < gv ? "meta" : "google") : (mv > gv ? "meta" : "google");
          return (
            <div className="cmp-row" key={String(r.key)}>
              <div className="cmp-label">
                {r.label}
                {winner && <span className={`cmp-tag ${winner}`}>{winner === "meta" ? "Meta" : "Google"}</span>}
              </div>
              <Bar side="meta" value={mv} max={max} label={r.fmt(mv)} />
              <Bar side="google" value={gv} max={max} label={r.fmt(gv)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const PlatformCompare = memo(PlatformCompareBase);
