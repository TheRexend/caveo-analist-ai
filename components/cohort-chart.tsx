"use client";
import { memo, useMemo } from "react";
import { Layers } from "lucide-react";
import { fmtNum, fmtPct } from "@/lib/format";
import type { CohortPoint } from "@/lib/types";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_NAMES[idx] ?? m}/${(y ?? "").slice(2)}`;
}

/** refMonth = mês do fechamento (YYYY-MM de dateTo). */
function CohortChartBase({ cohort, refMonth }: { cohort: CohortPoint[] | undefined; refMonth: string }) {
  const { rows, total, priorPct } = useMemo(() => {
    const list = cohort ?? [];
    const t = list.reduce((a, b) => a + b.qtd, 0);
    const prior = list.filter((r) => r.mes < refMonth).reduce((a, b) => a + b.qtd, 0);
    // ordenar por mês desc (mais recente no topo)
    const sorted = [...list].sort((a, b) => b.mes.localeCompare(a.mes));
    return { rows: sorted, total: t, priorPct: t > 0 ? prior / t : 0 };
  }, [cohort, refMonth]);

  if (!cohort || total === 0) return null;
  const max = Math.max(1, ...rows.map((r) => r.qtd));

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="section-title"><Layers size={13} /> Coorte de fechamento</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>
            Fechados no período ({fmtNum(total)}) por mês de origem da captação
          </div>
        </div>
        <span className="section-sub">
          <b className="num">{fmtPct(priorPct, 0)}</b> vieram de captações de meses anteriores
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
        {rows.map((r) => {
          const isRef = r.mes === refMonth;
          return (
            <div key={r.mes} style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px", alignItems: "center", gap: 10 }}>
              <span className="section-sub" style={{ color: isRef ? "var(--c-text)" : undefined, fontWeight: isRef ? 600 : 400 }}>
                {monthLabel(r.mes)}{isRef ? " · mesmo mês" : ""}
              </span>
              <span className="ga4-bar-track">
                <span className="ga4-bar-fill" style={{ width: `${(r.qtd / max) * 100}%`, background: isRef ? "var(--c-accent)" : "var(--c-success)" }} />
              </span>
              <span className="num" style={{ textAlign: "right", fontSize: 12 }}>
                {fmtNum(r.qtd)} <span className="section-sub">({fmtPct(r.qtd / total, 0)})</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const CohortChart = memo(CohortChartBase);
