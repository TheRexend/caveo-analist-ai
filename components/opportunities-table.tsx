"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import type { OpportunityRow } from "@/lib/types";

type AtribFilter = "all" | "cpc" | "cruzamento";

const COLS = ["Nome da conta", "Fase", "Atribuição", "Email Lead", "Origem (UTM)", "Nome da Oportunidade"];

function OpportunitiesTableBase({
  rows, loading, stageLabel, onClose,
}: {
  rows: OpportunityRow[];
  loading: boolean;
  stageLabel: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [atrib, setAtrib] = useState<AtribFilter>("all");
  const [faseFilter, setFaseFilter] = useState("all");

  // Reseta filtros quando mudar de estágio (rows trocar completamente).
  useEffect(() => {
    setSearch("");
    setAtrib("all");
    setFaseFilter("all");
  }, [stageLabel]);

  const uniqueFases = useMemo(
    () => [...new Set(rows.map((r) => r.stage).filter(Boolean))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (atrib !== "all" && r.origem !== atrib) return false;
      if (faseFilter !== "all" && r.stage !== faseFilter) return false;
      if (q && !r.account.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, atrib, faseFilter]);

  const hasCruzamento = rows.some((r) => r.origem === "cruzamento");

  const exportCSV = () => {
    const header = COLS.join(";");
    const lines = filteredRows.map((r) =>
      [r.account, r.stage, r.origem, r.email, r.source, r.name].map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(";"),
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
            : filteredRows.length === rows.length
              ? `${rows.length} oportunidade${rows.length === 1 ? "" : "s"} · ${stageLabel}`
              : `${filteredRows.length} de ${rows.length} · ${stageLabel}`}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" title="Exportar CSV (filtrado)" onClick={exportCSV} disabled={loading || filteredRows.length === 0}>
            <Download size={14} />
          </button>
          <button className="btn btn-ghost" title="Fechar" aria-label="Fechar tabela de oportunidades" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <div className="opp-filters">
          <div className="search opp-search">
            <Search size={13} className="search-icon" style={{ pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail…"
            />
          </div>

          {hasCruzamento && (
            <div className="opp-filter-chips">
              {(["all", "cpc", "cruzamento"] as const).map((opt) => (
                <button
                  key={opt}
                  className={`opp-chip${atrib === opt ? " active" : ""}${opt === "cruzamento" && atrib === opt ? " chip-cruzamento" : ""}`}
                  onClick={() => setAtrib(opt)}
                >
                  {opt === "all" ? "Todos" : opt}
                </button>
              ))}
            </div>
          )}

          {uniqueFases.length > 1 && (
            <select
              className="opp-fase-select"
              value={faseFilter}
              onChange={(e) => setFaseFilter(e.target.value)}
            >
              <option value="all">Todas as fases</option>
              {uniqueFases.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
        </div>
      )}

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
              filteredRows.map((r) => (
                <tr key={r.id} className="opp-row">
                  <td className="first" style={{ textAlign: "left", fontWeight: 500 }}>{r.account}</td>
                  <td style={{ textAlign: "left" }}>
                    {r.stage ? <span className="stage-chip">{r.stage}</span> : "—"}
                  </td>
                  <td style={{ textAlign: "left" }}>
                    <span className={`origem-badge origem-${r.origem}`}>
                      {r.origem === "cruzamento" ? "cruzamento" : "cpc"}
                    </span>
                  </td>
                  <td style={{ textAlign: "left" }}>{r.email || "—"}</td>
                  <td style={{ textAlign: "left" }}>{r.source || "—"}</td>
                  <td style={{ textAlign: "left" }}>{r.name}</td>
                </tr>
              ))}

            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: 32, color: "var(--c-text-muted)" }}>
                  {rows.length === 0
                    ? "Nenhuma oportunidade neste estágio para o filtro atual."
                    : "Nenhuma oportunidade corresponde aos filtros aplicados."}
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
