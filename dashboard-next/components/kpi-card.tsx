"use client";
import type { LucideIcon } from "lucide-react";
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
}

export function KpiCard({
  label, value, format, icon: Icon, goal, goalType = "min", hasProgress, fullBrl,
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

  return (
    <div className="kpi-card fade-up">
      <div className="kpi-label">
        <span>{label}</span>
        <span className="kpi-icon"><Icon size={13} strokeWidth={1.6} /></span>
      </div>
      <div className="kpi-value num">{formatted}</div>

      {hasProgress && goal != null ? (
        <div className="kpi-progress">
          <div className="kpi-progress-track">
            <div className={`kpi-progress-fill ${status}`} style={{ width: fillWidth + "%" }} />
          </div>
          <div className="kpi-progress-meta">
            <span><span className="num">{Math.round(pct * 100)}%</span> da meta</span>
            <span className="num">{goalText}</span>
          </div>
        </div>
      ) : goal != null ? (
        <div className="kpi-meta">
          <span className={`status-tag status-${status}`}>
            <span className="dot" />
            {STATUS_LABEL[status]} · meta {goalText}
          </span>
        </div>
      ) : (
        <div className="kpi-meta">&nbsp;</div>
      )}
    </div>
  );
}
