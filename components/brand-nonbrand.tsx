"use client";
import { memo, useMemo } from "react";
import { Split } from "lucide-react";
import { fmtBRL, fmtNum } from "@/lib/format";
import type { Campaign, Platform } from "@/lib/types";

// Termos que marcam uma campanha Google como "marca" (brand).
const BRAND_TERMS = ["caveo", "marca", "brand", "institucional"];
const isBrand = (name: string) => {
  const n = name.toLowerCase();
  return BRAND_TERMS.some((t) => n.includes(t));
};

interface Agg {
  invest: number;
  clicks: number;
  leads: number;
  oport: number;
}
const empty = (): Agg => ({ invest: 0, clicks: 0, leads: 0, oport: 0 });
const add = (s: Agg, c: Campaign) => {
  s.invest += c.invest; s.clicks += c.clicks; s.leads += c.leads; s.oport += c.oport;
};
const cpl = (s: Agg) => (s.leads > 0 ? s.invest / s.leads : 0);

function BrandNonBrandBase({ campaigns, platform }: { campaigns: Campaign[]; platform: Platform }) {
  const { brand, nonbrand, has } = useMemo(() => {
    const b = empty(), nb = empty();
    let count = 0;
    for (const c of campaigns) {
      if (c.platform !== "google") continue;
      count++;
      if (isBrand(c.name)) add(b, c); else add(nb, c);
    }
    return { brand: b, nonbrand: nb, has: count > 0 };
  }, [campaigns]);

  // Só faz sentido quando há campanhas Google no escopo.
  if ((platform !== "all" && platform !== "google") || !has) return null;

  const col = (title: string, s: Agg) => (
    <div className="bnb-col">
      <div className="bnb-col-title">{title}</div>
      <div className="bnb-row"><span>Investimento</span><b className="num">{fmtBRL(s.invest, { compact: s.invest > 9999 })}</b></div>
      <div className="bnb-row"><span>Cliques</span><b className="num">{fmtNum(s.clicks)}</b></div>
      <div className="bnb-row"><span>Conversões</span><b className="num">{fmtNum(s.leads)}</b></div>
      <div className="bnb-row"><span>Oportunidades</span><b className="num">{fmtNum(s.oport)}</b></div>
      <div className="bnb-row"><span>CPL</span><b className="num">{s.leads > 0 ? fmtBRL(cpl(s), { digits: 2 }) : "—"}</b></div>
    </div>
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <div><h3 className="section-title"><Split size={13} /> Google · Marca × Não-marca</h3></div>
        <span className="section-sub">Classificado por nome de campanha</span>
      </div>
      <div className="bnb-grid">
        {col("Marca", brand)}
        {col("Não-marca", nonbrand)}
      </div>
    </section>
  );
}

export const BrandNonBrand = memo(BrandNonBrandBase);
