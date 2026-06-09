"use client";
import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Download, Filter, Search } from "lucide-react";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import type { Campaign, Platform } from "@/lib/types";

type SortCol = keyof Campaign;
interface Col {
  key: SortCol;
  label: string;
  first?: boolean;
}

const COLS: Col[] = [
  { key: "platform", label: "Plataforma", first: true },
  { key: "name", label: "Campanha" },
  { key: "invest", label: "Investimento" },
  { key: "impr", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "leads", label: "Leads" },
  { key: "cpl", label: "CPL" },
  { key: "oport", label: "Oport." },
  { key: "cpo", label: "Custo / Oport." },
  { key: "ganho", label: "Fechamentos" },
];

export function CampaignsTable({
  rows, platform, search, onSearch, dayCount,
}: {
  rows: Campaign[];
  platform: Platform;
  search: string;
  onSearch: (s: string) => void;
  dayCount: number;
}) {
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "invest", dir: "desc" });
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (platform !== "all") r = r.filter((c) => c.platform === platform);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((c) => c.name.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      const va = a[sort.col], vb = b[sort.col];
      if (typeof va === "string" && typeof vb === "string")
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [rows, platform, search, sort]);

  const totals = useMemo(() => {
    const t = { invest: 0, impr: 0, clicks: 0, leads: 0, oport: 0, ganho: 0 };
    filtered.forEach((c) => {
      t.invest += c.invest; t.impr += c.impr; t.clicks += c.clicks;
      t.leads += c.leads; t.oport += c.oport; t.ganho += c.ganho;
    });
    return {
      ...t,
      ctr: t.clicks / Math.max(1, t.impr),
      cpc: t.invest / Math.max(1, t.clicks),
      cpl: t.invest / Math.max(1, t.leads),
      cpo: t.invest / Math.max(1, t.oport),
    };
  }, [filtered]);

  const toggleSort = (col: SortCol) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));

  const exportCSV = () => {
    const header = COLS.map((c) => c.label).join(";");
    const lines = filtered.map((c) =>
      [c.platform, c.name, c.invest, c.impr, c.clicks, c.ctr, c.cpc, c.leads, c.cpl, c.oport, c.cpo, c.ganho]
        .map((v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : `"${v}"`))
        .join(";"),
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campanhas_${platform}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div>
          <h3 className="section-title"><Filter size={13} /> Campanhas de mídia paga</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>
            {filtered.length} campanha{filtered.length === 1 ? "" : "s"} · {dayCount} dias selecionados
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="search">
            <span className="search-icon"><Search size={14} /></span>
            <input type="text" placeholder="Buscar campanha..." value={search} onChange={(e) => onSearch(e.target.value)} />
          </div>
          <button className="btn btn-ghost" title="Exportar CSV" onClick={exportCSV}>
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="campaigns">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.first ? "first" : ""} ${sort.col === c.key ? "sorted" : ""}`}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  <span className="sort-ind">{sort.dir === "asc" ? "↑" : "↓"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Fragment key={c.id}>
                <tr className={expanded === c.id ? "expanded" : ""} onClick={() => setExpanded((e) => (e === c.id ? null : c.id))}>
                  <td className="first">
                    <span className="expander"><ChevronRight size={12} /></span>
                    <span className={`platform-pill ${c.platform}`}>
                      <span className="dot" />
                      {c.platform === "google" ? "Google" : "Meta"}
                    </span>
                  </td>
                  <td style={{ textAlign: "left", fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</td>
                  <td className="num">{fmtBRL(c.invest)}</td>
                  <td className="num">{fmtNum(c.impr)}</td>
                  <td className="num">{fmtNum(c.clicks)}</td>
                  <td className="num">{fmtPct(c.ctr, 2)}</td>
                  <td className="num">{fmtBRL(c.cpc, { digits: 2 })}</td>
                  <td className="num">{fmtNum(c.leads)}</td>
                  <td className="num">{fmtBRL(c.cpl, { digits: 0 })}</td>
                  <td className="num">{fmtNum(c.oport)}</td>
                  <td className="num">{fmtBRL(c.cpo, { digits: 0 })}</td>
                  <td className="num">{fmtNum(c.ganho)}</td>
                </tr>
                <tr className="expand-row">
                  <td colSpan={COLS.length}>
                    <div className={`expand-content ${expanded === c.id ? "open" : ""}`}>
                      <div className="expand-inner">
                        <div className="expand-metric">
                          <div className="lbl">Investimento diário médio</div>
                          <div className="val num">{fmtBRL(c.invest / Math.max(1, dayCount), { digits: 0 })}</div>
                        </div>
                        <div className="expand-metric">
                          <div className="lbl">Tx Lead → Oportunidade</div>
                          <div className="val num">{fmtPct(c.txLeadOport, 1)}</div>
                        </div>
                        <div className="expand-metric">
                          <div className="lbl">Tx Oportunidade → Ganho</div>
                          <div className="val num">{fmtPct(c.txOportGanho, 1)}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: 40, color: "var(--c-text-muted)" }}>
                  Nenhuma campanha encontrada para o filtro atual.
                </td>
              </tr>
            )}

            {filtered.length > 0 && (
              <tr className="total-row">
                <td className="first">—</td>
                <td style={{ textAlign: "left" }}>TOTAL · {filtered.length} campanhas</td>
                <td className="num">{fmtBRL(totals.invest)}</td>
                <td className="num">{fmtNum(totals.impr)}</td>
                <td className="num">{fmtNum(totals.clicks)}</td>
                <td className="num">{fmtPct(totals.ctr, 2)}</td>
                <td className="num">{fmtBRL(totals.cpc, { digits: 2 })}</td>
                <td className="num">{fmtNum(totals.leads)}</td>
                <td className="num">{fmtBRL(totals.cpl, { digits: 0 })}</td>
                <td className="num">{fmtNum(totals.oport)}</td>
                <td className="num">{fmtBRL(totals.cpo, { digits: 0 })}</td>
                <td className="num">{fmtNum(totals.ganho)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
