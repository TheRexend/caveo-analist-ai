"use client";
import { Fragment, memo } from "react";
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
  /** Composição do estágio (ex.: Fechado vs Ganho não Identificado). */
  breakdown?: Record<string, number>;
  /** Nota curta sob o estágio (ex.: "fechados no período"). */
  note?: string;
  /** Quantas oportunidades deste estágio vieram via CRUZAMENTO (click ID, medium ≠ cpc). */
  cruzamento?: number;
}

// Estágios com drill-down de oportunidades (Lead Novo vem de mídia, não do CRM).
const DRILLABLE = new Set(["no_crm", "trat", "prop", "ganho"]);

function FunnelBase({
  stages, lost, totalInvest, lostCruzamento, onStageClick, selectedStage,
}: {
  stages: FunnelStage[];
  lost: number;
  totalInvest: number;
  lostCruzamento?: number;
  onStageClick?: (key: string) => void;
  selectedStage?: string | null;
}) {
  if (stages.length === 0) return null;
  const max = Math.max(...stages.map((s) => s.count), 1);
  const lostCost = lost * (totalInvest / Math.max(1, stages[1]?.count ?? 1));

  return (
    <div className="funnel">
      <div className="funnel-row">
        {stages.map((s, i) => {
          const clickable = !!onStageClick && DRILLABLE.has(s.key);
          return (
          <Fragment key={s.key}>
            <div
              className={`stage${clickable ? " clickable" : ""}${selectedStage === s.key ? " selected" : ""}`}
              onClick={clickable ? () => onStageClick!(s.key) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-pressed={clickable ? selectedStage === s.key : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onStageClick!(s.key);
                      }
                    }
                  : undefined
              }
            >
              <div className="stage-label">{s.label}</div>
              <div className="stage-value num">{fmtNum(s.count)}</div>
              <div className="stage-sub">{s.unit ? fmtBRL(s.unit, { digits: 0 }) + " / un." : " "}</div>
              {s.breakdown && Object.keys(s.breakdown).length > 0 && (
                <div className="stage-breakdown">
                  {Object.entries(s.breakdown).map(([name, n]) => (
                    <span key={name} className="stage-chip" title={name}>
                      {name} <span className="num">{fmtNum(n)}</span>
                    </span>
                  ))}
                </div>
              )}
              {s.cruzamento != null && (
                <div className="stage-cross">
                  <span
                    className={s.cruzamento > 0 ? "cross-badge" : "cross-badge cross-badge-zero"}
                    title="Capturadas via cruzamento (click ID, UtmMed__c ≠ cpc)"
                  >
                    {s.cruzamento > 0 ? "+" : ""}{fmtNum(s.cruzamento)} cruzamento
                  </span>
                </div>
              )}
              {s.note && <div className="stage-note">{s.note}</div>}
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
          );
        })}
      </div>

      <div className="lost-branch">
        <div className="lost-connector" />
        <div
          className={`lost-box${onStageClick ? " clickable" : ""}${selectedStage === "perdido" ? " selected" : ""}`}
          onClick={onStageClick ? () => onStageClick("perdido") : undefined}
          role={onStageClick ? "button" : undefined}
          tabIndex={onStageClick ? 0 : undefined}
          aria-pressed={onStageClick ? selectedStage === "perdido" : undefined}
          onKeyDown={
            onStageClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onStageClick("perdido");
                  }
                }
              : undefined
          }
        >
          <span className="lost-icon"><TrendingDown size={13} /></span>
          <div>
            <div className="stage-label">Oportunidades perdidas</div>
            <div className="stage-value num">{fmtNum(lost)}</div>
            {lostCruzamento != null && lostCruzamento > 0 && (
              <span className="cross-badge" title="Capturadas via cruzamento (click ID)">+{fmtNum(lostCruzamento)} cruzamento</span>
            )}
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

export const Funnel = memo(FunnelBase);
