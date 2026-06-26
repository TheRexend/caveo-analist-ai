"use client";
import { memo } from "react";
import { Download, X } from "lucide-react";
import type { OpportunityRow } from "@/lib/types";

const COLS = ["Nome da conta", "Email Lead", "Origem (UTM)", "Nome da Oportunidade", "Fase"];

function OpportunitiesTableBase({
  rows, loading, stageLabel, onClose,
}: {
  rows: OpportunityRow[];
  loading: boolean;
  stageLabel: string;
  onClose: () => void;
}) {
  const exportCSV = () => {
    const header = COLS.join(";");
    const lines = rows.map((r) =>
      [r.account, r.email, r.source, r.name, r.stage].map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(";"),
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oportunidades_${stageLabel.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="opp-drill">
      <div className="opp-drill-head">
        <div className="section-sub">
          {loading
            ? "Carregando oportunidades…"
            : `${rows.length} oportunidade${rows.length === 1 ? "" : "s"} · ${stageLabel}`}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" title="Exportar CSV" onClick={exportCSV} disabled={loading || rows.length === 0}>
            <Download size={14} />
          </button>
          <button className="btn btn-ghost" title="Fechar" aria-label="Fechar tabela de oportunidades" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="campaigns opp-table">
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th key={c} className={i === 0 ? "first" : ""} scope="col" style={{ textAlign: "left", cursor: "default" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk_${i}`}>
                  {COLS.map((c, j) => (
                    <td key={c} className={j === 0 ? "first" : ""} style={{ textAlign: "left" }}>
                      <div className="loading-shimmer" style={{ height: 12, borderRadius: 5, width: j === 1 ? "80%" : "60%" }} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="opp-row">
                  <td className="first" style={{ textAlign: "left", fontWeight: 500 }}>{r.account}</td>
                  <td style={{ textAlign: "left" }}>{r.email || "—"}</td>
                  <td style={{ textAlign: "left" }}>{r.source || "—"}</td>
                  <td style={{ textAlign: "left" }}>{r.name}</td>
                  <td style={{ textAlign: "left" }}><span className="stage-chip">{r.stage}</span></td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: 32, color: "var(--c-text-muted)" }}>
                  Nenhuma oportunidade neste estágio para o filtro atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const OpportunitiesTable = memo(OpportunitiesTableBase);
