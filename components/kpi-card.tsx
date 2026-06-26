"use client";
import { memo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { fmtBRL, fmtNum, fmtPct, statusFromGoal } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";

export type KpiFormat = "brl" | "num" | "pct";

const STATUS_LABEL: Record<string, string> = {
  good: "no alvo",
  warn: "atenção",
  bad: "abaixo",
};

interface KpiCardProps {
  label: string;
  value: number;
  format: KpiFormat;
  icon: LucideIcon;
  goal?: number;
  goalType?: "min" | "max";
  hasProgress?: boolean;
  fullBrl?: boolean;
  /** Valor no período anterior equivalente (para delta). */
  previous?: number;
  /** "period" → meta pró-rateada pelo intervalo; "month" → meta mensal cheia. */
  goalScope?: "period" | "month";
  /** Linha auxiliar (ex.: composição do fechamento). */
  footnote?: string;
  /** Quantas oportunidades deste KPI vieram via CRUZAMENTO (click ID); mostra badge "+N". */
  cross?: number;
}

function KpiCardBase({
  label, value, format, icon: Icon, goal, goalType = "min", hasProgress, fullBrl,
  previous, goalScope = "month", footnote, cross,
}: KpiCardProps) {
  const animated = useCountUp(value);
  const status = goal != null ? statusFromGoal(value, goal, goalType) : "neutral";
  const pct = goal ? Math.min(1.5, value / goal) : 0;
  const fillWidth = goal ? Math.min(100, (value / goal) * 100) : 0;

  let formatted: string;
  if (format === "brl") formatted = fmtBRL(animated, { compact: !fullBrl && animated > 9999, digits: fullBrl ? 2 : 0 });
  else if (format === "pct") formatted = fmtPct(animated, 1);
  else formatted = fmtNum(Math.round(animated));

  const goalText =
    goal == null ? "" : format === "brl" ? fmtBRL(goal, { compact: !fullBrl }) : format === "pct" ? fmtPct(goal, 0) : fmtNum(goal);
  const metaWord = goalScope === "period" ? "meta (período)" : "meta";

  // ── Delta vs. período anterior ──────────────────────────────────────
  const hasPrev = previous != null && isFinite(previous) && previous > 0;
  const deltaRatio = hasPrev ? (value - previous!) / previous! : null;
  const flat = deltaRatio != null && Math.abs(deltaRatio) < 0.0005;
  // "max" (quanto menor melhor) → queda é boa; "min" → alta é boa.
  const improving = deltaRatio == null ? null : goalType === "max" ? deltaRatio < 0 : deltaRatio > 0;
  const deltaCls = deltaRatio == null ? "" : flat ? "flat" : improving ? "good" : "bad";
  const DeltaIcon = deltaRatio == null || flat ? Minus : deltaRatio > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="kpi-card fade-up">
      <div className="kpi-label">
        <span>{label}</span>
        <span className="kpi-icon"><Icon size={13} strokeWidth={1.6} /></span>
      </div>

      <div className="kpi-value-row">
        <div className="kpi-value num">{formatted}</div>
        {deltaRatio != null && (
          <span className={`kpi-delta ${deltaCls}`} title="vs. período anterior">
            <DeltaIcon size={12} strokeWidth={2} />
            <span className="num">{flat ? "0%" : fmtPct(Math.abs(deltaRatio), 0)}</span>
          </span>
        )}
      </div>

      {cross != null && cross > 0 && (
        <div className="kpi-cross" title="Oportunidades com UtmMed__c ≠ cpc capturadas via click ID (fbc/fbclid/gclid/gbraid)">
          <span className="cross-badge">+{fmtNum(cross)} cruzamento</span>
        </div>
      )}

      {footnote && <div className="kpi-footnote">{footnote}</div>}

      {hasProgress && goal != null ? (
        <div className="kpi-progress">
          <div className="kpi-progress-track">
            <div className={`kpi-progress-fill ${status}`} style={{ width: fillWidth + "%" }} />
          </div>
          <div className="kpi-progress-meta">
            <span><span className="num">{Math.round(pct * 100)}%</span> da {metaWord}</span>
            <span className="num">{goalText}</span>
          </div>
        </div>
      ) : goal != null ? (
        <div className="kpi-meta">
          <span className={`status-tag status-${status}`}>
            <span className="dot" />
            {STATUS_LABEL[status]} · {metaWord} {goalText}
          </span>
        </div>
      ) : (
        <div className="kpi-meta">&nbsp;</div>
      )}
    </div>
  );
}

export const KpiCard = memo(KpiCardBase);
