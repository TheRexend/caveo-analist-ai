"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Coins, Filter, Repeat, Target, TrendingDown, Trophy, Users, Wallet,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { KpiCard } from "@/components/kpi-card";
import { Funnel, type FunnelStage } from "@/components/funnel";
import { TimelineChart } from "@/components/timeline-chart";
import { CampaignsTable } from "@/components/campaigns-table";
import { PlatformCompare } from "@/components/platform-compare";
import { EfficiencyScatter } from "@/components/efficiency-scatter";
import { GoalsDialog } from "@/components/goals-dialog";
import {
  fetchCampaigns, fetchDashboard, fetchGoals, fetchMetrics, saveGoals as apiSaveGoals,
} from "@/lib/api-client";
import { daysBetween } from "@/lib/dates";
import { convStatus, fmtMonth, isFullMonth, monthKey, prorateGoal } from "@/lib/format";
import { useTheme } from "@/lib/use-theme";
import type {
  Campaign, FunnelData, Goals, Metrics, Platform, TimelineDay,
} from "@/lib/types";

type DataMode = "live" | "mock" | "loading";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function Dashboard({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [platform, setPlatform] = useState<Platform>("all");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [search, setSearch] = useState("");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsByMonth, setGoalsByMonth] = useState<Record<string, Goals>>({});
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, toggleTheme] = useTheme();

  const [k, setK] = useState<Metrics | null>(null);
  const [kPrev, setKPrev] = useState<Metrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [timelineDays, setTimelineDays] = useState<TimelineDay[]>([]);
  const [funnelRaw, setFunnelRaw] = useState<FunnelData | null>(null);

  const mKey = monthKey(dateTo);
  const monthGoals = goalsByMonth[mKey] ?? {};
  const dayCount = daysBetween(dateFrom, dateTo);
  const fullMonth = isFullMonth(dateFrom, dateTo);

  // Meses civis tocados pelo intervalo (para metas pró-rateadas).
  const monthsInRange = useMemo(() => {
    const out: string[] = [];
    let cur = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T00:00:00");
    while (cur <= end) {
      out.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`);
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return out;
  }, [dateFrom, dateTo]);

  // Período anterior equivalente (mesmo nº de dias imediatamente antes).
  const prevRange = useMemo(() => {
    const len = daysBetween(dateFrom, dateTo);
    const prevTo = new Date(dateFrom + "T00:00:00");
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - (len - 1));
    return { from: isoOf(prevFrom), to: isoOf(prevTo) };
  }, [dateFrom, dateTo]);

  // ── Fetch principal (métricas, timeline, funil) ──────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    setDataMode("loading");

    fetchDashboard(platform, dateFrom, dateTo, mKey, ctrl.signal)
      .then(({ metrics, timeline, funnel }) => {
        if (ctrl.signal.aborted) return;
        setK(metrics);
        setTimelineDays(timeline);
        setFunnelRaw(funnel);
        setDataMode(metrics._mock ? "mock" : "live");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDataMode("mock");
      });

    fetchCampaigns(platform, dateFrom, dateTo, ctrl.signal)
      .then((c) => !ctrl.signal.aborted && setCampaigns(c))
      .catch(() => !ctrl.signal.aborted && setCampaigns([]));

    return () => ctrl.abort();
  }, [platform, dateFrom, dateTo, mKey, refreshKey]);

  // ── Métricas do período anterior (deltas) ────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    fetchMetrics(platform, prevRange.from, prevRange.to, ctrl.signal)
      .then((m) => !ctrl.signal.aborted && setKPrev(m))
      .catch(() => !ctrl.signal.aborted && setKPrev(null));
    return () => ctrl.abort();
  }, [platform, prevRange, refreshKey]);

  // ── Fetch de metas de todos os meses do intervalo ────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      monthsInRange.map((m) =>
        fetchGoals(m).then((g) => [m, g] as const).catch(() => [m, {} as Goals] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setGoalsByMonth((prev) => {
        const next = { ...prev };
        for (const [m, g] of entries) next[m] = g;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [monthsInRange]);

  const handleSaveGoals = useCallback(
    async (g: Partial<Goals>) => {
      setGoalsByMonth((prev) => ({ ...prev, [mKey]: { ...prev[mKey], ...g } as Goals }));
      try {
        await apiSaveGoals(mKey, g);
      } catch {
        /* ignora */
      }
    },
    [mKey],
  );

  // ── Metas resolvidas: volume pró-rateado, taxa/custo mensal fixa ──────
  const volGoal = useCallback(
    (metric: string) => prorateGoal(dateFrom, dateTo, (ym) => goalsByMonth[ym]?.[metric]),
    [dateFrom, dateTo, goalsByMonth],
  );
  const rateGoal = useCallback(
    (metric: string) => {
      const v = monthGoals[metric];
      return v == null || isNaN(v) ? undefined : v;
    },
    [monthGoals],
  );
  const volScope = fullMonth ? "month" : "period";

  // Composição do fechamento (Fechado vs Ganho não Identificado).
  const ganhoFootnote = useMemo(() => {
    const b = funnelRaw?.ganho_breakdown;
    if (!b || Object.keys(b).length === 0) return undefined;
    return Object.entries(b)
      .map(([name, v]) => `${name === "Ganho não Identificado" ? "Ganho n/ident." : name}: ${v}`)
      .join(" · ");
  }, [funnelRaw]);

  // ── Estágios do funil derivados ──────────────────────────────────────
  const funnelStages = useMemo<FunnelStage[]>(() => {
    if (!funnelRaw) return [];
    const { lead_novo, no_crm, em_tratamento, proposta, ganho, ganho_breakdown } = funnelRaw;
    return [
      {
        key: "lead", label: "Lead Novo", count: lead_novo,
        unit: k ? k.invest / Math.max(1, lead_novo) : 0,
        convRate: lead_novo > 0 ? no_crm / lead_novo : null,
        convStatus: lead_novo > 0 ? convStatus(no_crm / lead_novo, [0.15, 0.4]) : null,
        goal: monthGoals.leads,
      },
      {
        key: "no_crm", label: "Oportunidades", count: no_crm,
        unit: k ? k.invest / Math.max(1, no_crm) : 0,
        convRate: no_crm > 0 ? em_tratamento / no_crm : null,
        convStatus: no_crm > 0 ? convStatus(em_tratamento / no_crm, [0.4, 0.7]) : null,
        note: "geradas no período",
      },
      {
        key: "trat", label: "Em Tratamento", count: em_tratamento,
        unit: k ? k.invest / Math.max(1, em_tratamento) : 0,
        convRate: em_tratamento > 0 ? proposta / em_tratamento : null,
        convStatus: em_tratamento > 0 ? convStatus(proposta / em_tratamento, [0.02, 0.06]) : null,
      },
      {
        key: "prop", label: "Proposta", count: proposta,
        unit: k ? k.cpo : 0,
        convRate: no_crm > 0 ? ganho / no_crm : null,
        convStatus: no_crm > 0 ? convStatus(ganho / no_crm, [0.05, 0.15]) : null,
        convLabel: "vs. Oport.",
        goal: monthGoals.oport,
      },
      {
        key: "ganho", label: "Fechado Ganho", count: ganho,
        unit: k ? k.cpf : 0, goal: monthGoals.ganho,
        breakdown: ganho_breakdown,
        note: "fechados no período",
      },
    ];
  }, [funnelRaw, k, monthGoals]);

  return (
    <div className="app">
      <TopBar
        platform={platform}
        onPlatform={setPlatform}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDates={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onOpenGoals={() => setGoalsOpen(true)}
        onRefresh={() => setRefreshKey((x) => x + 1)}
        currentMonthLabel={fmtMonth(mKey).replace(" de ", "/")}
        dataMode={dataMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="main">
        {!k ? (
          <div className="kpi-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="loading-shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 10, width: "60%" }} />
                <div className="loading-shimmer" style={{ height: 28, borderRadius: 6, width: "80%" }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="section-head">
              <h2 className="section-title">
                <Target size={14} /> Visão geral · {dayCount} dias do período
              </h2>
              <span className="section-sub">
                {dataMode === "live" ? "Dados em tempo real via API" : dataMode === "mock" ? "Dados mockados · configure credenciais" : "Carregando…"}
              </span>
            </div>

            <div className="kpi-grid">
              <KpiCard label="Investimento total" value={k.invest} format="brl" icon={Wallet} goal={volGoal("invest")} goalType="max" goalScope={volScope} hasProgress fullBrl previous={kPrev?.invest} />
              <KpiCard label="Volume de leads" value={k.leads} format="num" icon={Users} goal={volGoal("leads")} goalType="min" goalScope={volScope} hasProgress previous={kPrev?.leads} />
              <KpiCard label="Custo por lead" value={k.cpl} format="brl" icon={Coins} goal={rateGoal("cpl")} goalType="max" previous={kPrev?.cpl} />
              <KpiCard label="Oportunidades" value={k.oport} format="num" icon={Filter} goal={volGoal("oport")} goalType="min" goalScope={volScope} hasProgress previous={kPrev?.oport} />
              <KpiCard label="Custo por oportunidade" value={k.cpo} format="brl" icon={Coins} goal={rateGoal("cpo")} goalType="max" previous={kPrev?.cpo} />
              <KpiCard label="Tx. conv. Oport→Ganho" value={k.tx_conv} format="pct" icon={Repeat} goal={rateGoal("tx_conv")} goalType="min" previous={kPrev?.tx_conv} />
              <KpiCard label="Fechamentos · Ganho" value={k.ganho} format="num" icon={Trophy} goal={volGoal("ganho")} goalType="min" goalScope={volScope} hasProgress previous={kPrev?.ganho} footnote={ganhoFootnote} />
              <KpiCard label="Custo por fechamento" value={k.cpf} format="brl" icon={Coins} goal={rateGoal("cpf")} goalType="max" previous={kPrev?.cpf} />
              <KpiCard label="Oportunidades perdidas" value={k.oport_perdidas} format="num" icon={TrendingDown} goal={volGoal("oport_perdidas")} goalType="max" goalScope={volScope} previous={kPrev?.oport_perdidas} />
            </div>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3 className="section-title"><Filter size={13} /> Funil de conversão</h3>
                  <div className="section-sub" style={{ marginTop: 3 }}>
                    Lead Novo → Oportunidades → Em Tratamento → Proposta → Fechado Ganho · fechamentos contados por data de mudança de fase
                  </div>
                </div>
                <span className="section-sub">Fonte · Salesforce + UTM por plataforma</span>
              </div>
              <Funnel stages={funnelStages} lost={k.oport_perdidas} totalInvest={k.invest} />
            </section>

            {platform === "all" && <PlatformCompare from={dateFrom} to={dateTo} />}

            <TimelineChart days={timelineDays} platform={platform} />

            <EfficiencyScatter campaigns={campaigns} platform={platform} />

            <CampaignsTable rows={campaigns} platform={platform} search={search} onSearch={setSearch} dayCount={dayCount} />

            <footer style={{ textAlign: "center", padding: "10px 0 0", fontSize: 11, color: "var(--c-text-faint)" }}>
              {dataMode === "live" ? "Dashboard ao vivo · Next.js" : "Dashboard local · dados mockados"} · Caveo Analyst AI
            </footer>
          </>
        )}
      </main>

      <GoalsDialog
        open={goalsOpen}
        onOpenChange={setGoalsOpen}
        monthKey={mKey}
        goals={monthGoals}
        onSave={handleSaveGoals}
      />
    </div>
  );
}
