"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Coins, Filter, Repeat, Target, TrendingDown, Trophy, Users, Wallet,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { KpiCard } from "@/components/kpi-card";
import { Funnel, type FunnelStage } from "@/components/funnel";
import { TimelineChart } from "@/components/timeline-chart";
import { OpportunitiesChart } from "@/components/opportunities-chart";
import { CampaignsTable } from "@/components/campaigns-table";
import { OpportunitiesTable } from "@/components/opportunities-table";
import { PlatformCompare } from "@/components/platform-compare";
import { EfficiencyScatter } from "@/components/efficiency-scatter";
import { GoalsDialog } from "@/components/goals-dialog";
import { HealthIndicators } from "@/components/health-indicators";
import {
  fetchDashboardAll, fetchGoals, fetchOpportunities, saveGoals as apiSaveGoals,
} from "@/lib/api-client";
import { daysBetween } from "@/lib/dates";
import { convStatus, fmtMonth, isFullMonth, monthKey, prorateGoal } from "@/lib/format";
import { useTheme } from "@/lib/use-theme";
import type {
  Campaign, Contratante, DailyFunnelPoint, FunnelData, FunnelDrillKey, Goals, Metrics,
  OpportunityRow, Platform, PlatformCompareData, TimelineDay,
} from "@/lib/types";

const STAGE_LABEL: Record<string, string> = {
  no_crm: "Oportunidades", trat: "Em Tratamento", prop: "Proposta",
  ganho: "Fechado Ganho", perdido: "Oportunidades perdidas",
};

type DataMode = "live" | "mock" | "loading";

const pad = (n: number) => String(n).padStart(2, "0");

export function Dashboard({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [platform, setPlatform] = useState<Platform>("all");
  const [contratante, setContratante] = useState<Contratante>("all");
  const [cruzamento, setCruzamento] = useState(true);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [search, setSearch] = useState("");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsByMonth, setGoalsByMonth] = useState<Record<string, Goals>>({});
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, toggleTheme] = useTheme();
  const freshRef = useRef(false);

  const [k, setK] = useState<Metrics | null>(null);
  const [kPrev, setKPrev] = useState<Metrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [timelineDays, setTimelineDays] = useState<TimelineDay[]>([]);
  const [dailyFunnel, setDailyFunnel] = useState<DailyFunnelPoint[]>([]);
  const [funnelRaw, setFunnelRaw] = useState<FunnelData | null>(null);
  const [platformCompareData, setPlatformCompareData] = useState<PlatformCompareData | null>(null);

  // Drill-down de oportunidades (clique num estágio do funil).
  const [selectedStage, setSelectedStage] = useState<FunnelDrillKey | null>(null);
  const [oppRows, setOppRows] = useState<OpportunityRow[]>([]);
  const [oppLoading, setOppLoading] = useState(false);

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

  // ── Fetch consolidado (uma requisição = todo o dashboard) ────────────
  useEffect(() => {
    const ctrl = new AbortController();
    setDataMode("loading");
    const fresh = freshRef.current;
    freshRef.current = false;

    fetchDashboardAll(platform, dateFrom, dateTo, contratante, cruzamento, fresh, ctrl.signal)
      .then((d) => {
        if (ctrl.signal.aborted) return;
        setK(d.metrics);
        setKPrev(d.metricsPrev);
        setFunnelRaw(d.funnel);
        setTimelineDays(d.timeline);
        setDailyFunnel(d.dailyFunnel);
        setCampaigns(d.campaigns);
        setPlatformCompareData(d.platformCompare ?? null);
        setDataMode(d._mock ? "mock" : "live");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDataMode("mock");
      });

    return () => ctrl.abort();
  }, [platform, contratante, cruzamento, dateFrom, dateTo, refreshKey]);

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

  const handleRefresh = useCallback(() => {
    freshRef.current = true;
    setRefreshKey((x) => x + 1);
  }, []);

  // Alterna o estágio selecionado (clicar de novo no mesmo fecha a tabela).
  const handleStageClick = useCallback((key: string) => {
    setSelectedStage((prev) => (prev === key ? null : (key as FunnelDrillKey)));
  }, []);

  // ── Fetch do drill-down quando há estágio selecionado (segue os filtros) ──
  useEffect(() => {
    // Tabela desmonta quando não há estágio; não é preciso limpar as linhas aqui.
    if (!selectedStage) return;
    const ctrl = new AbortController();
    setOppLoading(true);
    fetchOpportunities(platform, dateFrom, dateTo, contratante, selectedStage, cruzamento, ctrl.signal)
      .then((rows) => {
        if (ctrl.signal.aborted) return;
        setOppRows(rows);
        setOppLoading(false);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setOppRows([]);
          setOppLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [selectedStage, platform, contratante, cruzamento, dateFrom, dateTo, refreshKey]);

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
    const { lead_novo, no_crm, em_tratamento, proposta, ganho, ganho_breakdown, cruzamento } = funnelRaw;
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
        cruzamento: cruzamento?.no_crm,
      },
      {
        key: "trat", label: "Em Tratamento", count: em_tratamento,
        unit: k ? k.invest / Math.max(1, em_tratamento) : 0,
        convRate: em_tratamento > 0 ? proposta / em_tratamento : null,
        convStatus: em_tratamento > 0 ? convStatus(proposta / em_tratamento, [0.02, 0.06]) : null,
        cruzamento: cruzamento?.em_tratamento,
      },
      {
        key: "prop", label: "Proposta", count: proposta,
        unit: k ? k.cpo : 0,
        convRate: no_crm > 0 ? ganho / no_crm : null,
        convStatus: no_crm > 0 ? convStatus(ganho / no_crm, [0.05, 0.15]) : null,
        convLabel: "vs. Oport.",
        goal: monthGoals.oport,
        cruzamento: cruzamento?.proposta,
      },
      {
        key: "ganho", label: "Fechado Ganho", count: ganho,
        unit: k ? k.cpf : 0, goal: monthGoals.ganho,
        breakdown: ganho_breakdown,
        note: "fechados no período",
        cruzamento: cruzamento?.ganho,
      },
    ];
  }, [funnelRaw, k, monthGoals]);

  return (
    <div className="app">
      <TopBar
        platform={platform}
        onPlatform={setPlatform}
        contratante={contratante}
        onContratante={setContratante}
        cruzamento={cruzamento}
        onCruzamento={setCruzamento}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDates={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onOpenGoals={() => setGoalsOpen(true)}
        onRefresh={handleRefresh}
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
              <div className="section-head-left">
                <h2 className="section-title">
                  <Target size={14} /> Visão geral · {dayCount} dias do período
                </h2>
                <HealthIndicators refreshKey={refreshKey} />
              </div>
              <span className="section-sub">
                {dataMode === "live" ? "Dados em tempo real via API" : dataMode === "mock" ? "Dados mockados · configure credenciais" : "Carregando…"}
              </span>
            </div>

            <div className="kpi-grid">
              <KpiCard label="Investimento total" value={k.invest} format="brl" icon={Wallet} goal={volGoal("invest")} goalType="max" goalScope={volScope} hasProgress fullBrl previous={kPrev?.invest} />
              <KpiCard label="Volume de leads" value={k.leads} format="num" icon={Users} goal={volGoal("leads")} goalType="min" goalScope={volScope} hasProgress previous={kPrev?.leads}
                secondary={platform === "meta" && k.complete_reg != null ? { value: k.complete_reg, format: "num", label: "reg. concluídos" } : undefined}
              />
              <KpiCard label="Custo por lead" value={k.cpl} format="brl" icon={Coins} goal={rateGoal("cpl")} goalType="max" previous={kPrev?.cpl}
                secondary={platform === "meta" && k.cpr != null ? { value: k.cpr, format: "brl", label: "por reg. concluído" } : undefined}
              />
              <KpiCard label="Oportunidades" value={k.oport} format="num" icon={Filter} goal={volGoal("oport")} goalType="min" goalScope={volScope} hasProgress previous={kPrev?.oport} cross={funnelRaw?.cruzamento?.no_crm} />
              <KpiCard label="Custo por oportunidade" value={k.cpo} format="brl" icon={Coins} goal={rateGoal("cpo")} goalType="max" previous={kPrev?.cpo} />
              <KpiCard label="Tx. conv. Oport→Ganho" value={k.tx_conv} format="pct" icon={Repeat} goal={rateGoal("tx_conv")} goalType="min" previous={kPrev?.tx_conv} />
              <KpiCard label="Fechamentos · Ganho" value={k.ganho} format="num" icon={Trophy} goal={volGoal("ganho")} goalType="min" goalScope={volScope} hasProgress previous={kPrev?.ganho} footnote={ganhoFootnote} cross={funnelRaw?.cruzamento?.ganho} />
              <KpiCard label="Custo por fechamento" value={k.cpf} format="brl" icon={Coins} goal={rateGoal("cpf")} goalType="max" previous={kPrev?.cpf} />
              <KpiCard label="Oportunidades perdidas" value={k.oport_perdidas} format="num" icon={TrendingDown} goal={volGoal("oport_perdidas")} goalType="max" goalScope={volScope} previous={kPrev?.oport_perdidas} cross={funnelRaw?.cruzamento?.perdido} />
            </div>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3 className="section-title"><Filter size={13} /> Funil de conversão</h3>
                  <div className="section-sub" style={{ marginTop: 3 }}>
                    Lead Novo → Oportunidades → Em Tratamento → Proposta → Fechado Ganho · clique num estágio para listar as oportunidades
                  </div>
                </div>
                <span className="section-sub">Fonte · Salesforce + UTM por plataforma</span>
              </div>
              <Funnel
                stages={funnelStages}
                lost={k.oport_perdidas}
                totalInvest={k.invest}
                lostCruzamento={funnelRaw?.cruzamento?.perdido}
                onStageClick={handleStageClick}
                selectedStage={selectedStage}
              />
              {selectedStage && (
                <OpportunitiesTable
                  rows={oppRows}
                  loading={oppLoading}
                  stageLabel={STAGE_LABEL[selectedStage] ?? selectedStage}
                  onClose={() => setSelectedStage(null)}
                />
              )}
            </section>

            <OpportunitiesChart days={dailyFunnel} platform={platform} contratante={contratante} />

            {platform === "all" && <PlatformCompare data={platformCompareData} />}

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
