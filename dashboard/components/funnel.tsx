"use client";
import { Fragment } from "react";
import { TrendingDown } from "lucide-react";
import { fmtBRL, fmtNum, fmtPct, type Status } from "@/lib/format";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  unit: number;
  convRate?: number | null;
  convStatus?: Status | null;
  convLabel?: string;
  goal?: number;
}

export function Funnel({
  stages, lost, totalInvest,
}: {
  stages: FunnelStage[];
  lost: number;
  totalInvest: number;
}) {
  if (stages.length === 0) return null;
  const max = Math.max(...stages.map((s) => s.count), 1);
  const lostCost = lost * (totalInvest / Math.max(1, stages[1]?.count ?? 1));

  return (
    <div className="funnel">
      <div className="funnel-row">
        {stages.map((s, i) => (
          <Fragment key={s.key}>
            <div className="stage">
              <div className="stage-label">{s.label}</div>
              <div className="stage-value num">{fmtNum(s.count)}</div>
              <div className="stage-sub">{s.unit ? fmtBRL(s.unit, { digits: 0 }) + " / un." : " "}</div>
              <div className="stage-bar" style={{ width: ((s.count / max) * 100).toFixed(1) + "%" }} />
            </div>
            {i < stages.length - 1 && (
              <div className="conv-arrow">
                <div className="conv-line" />
                {s.convRate != null ? (
                  <span className={`conv-pill ${s.convStatus ?? ""}`}>
                    <span className="dot" />
                    {fmtPct(s.convRate, 1)}
                  </span>
                ) : (
                  <span className="conv-pill" style={{ color: "var(--c-text-faint)", background: "none", border: "none" }}>—</span>
                )}
                {s.convLabel && <span className="conv-label">{s.convLabel}</span>}
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="lost-branch">
        <div className="lost-connector" />
        <div className="lost-box">
          <span className="lost-icon"><TrendingDown size={13} /></span>
          <div>
            <div className="stage-label">Oportunidades perdidas</div>
            <div className="stage-value num">{fmtNum(lost)}</div>
          </div>
          <div style={{ marginLeft: 14, fontSize: 11, color: "var(--c-text-muted)" }}>
            ramificação descendente · custo afundado{" "}
            <span className="num" style={{ color: "var(--c-text)", fontWeight: 600 }}>{fmtBRL(lostCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
