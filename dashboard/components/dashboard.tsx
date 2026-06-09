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
import { GoalsDialog } from "@/components/goals-dialog";
import {
  fetchCampaigns, fetchDashboard, fetchGoals, saveGoals as apiSaveGoals,
} from "@/lib/api-client";
import { convStatus, fmtMonth, monthKey } from "@/lib/format";
import type {
  Campaign, FunnelData, Goals, Metrics, Platform, TimelineDay,
} from "@/lib/types";

type DataMode = "live" | "mock" | "loading";

export function Dashboard({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [platform, setPlatform] = useState<Platform>("all");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [search, setSearch] = useState("");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsByMonth, setGoalsByMonth] = useState<Record<string, Goals>>({});
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [refreshKey, setRefreshKey] = useState(0);

  const [k, setK] = useState<Metrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [timelineDays, setTimelineDays] = useState<TimelineDay[]>([]);
  const [funnelRaw, setFunnelRaw] = useState<FunnelData | null>(null);

  const mKey = monthKey(dateTo);
  const monthGoals = goalsByMonth[mKey] ?? {};

  // ── Fetch principal (métricas, timeline, funil) ──────────────────────
  useEffect(() => {
    let cancelled = false;
    setDataMode("loading");

    fetchDashboard(platform, dateFrom, dateTo, mKey)
      .then(({ metrics, timeline, funnel }) => {
        if (cancelled) return;
        setK(metrics);
        setTimelineDays(timeline);
        setFunnelRaw(funnel);
        setDataMode(metrics._mock ? "mock" : "live");
      })
      .catch(() => {
        if (!cancelled) setDataMode("mock");
      });

    fetchCampaigns(platform, dateFrom, dateTo)
      .then((c) => !cancelled && setCampaigns(c))
      .catch(() => !cancelled && setCampaigns([]));

    return () => {
      cancelled = true;
    };
  }, [platform, dateFrom, dateTo, mKey, refreshKey]);

  // ── Fetch de metas ───────────────────────────────────────────────────
  useEffect(() => {
    fetchGoals(mKey)
      .then((g) => setGoalsByMonth((prev) => ({ ...prev, [mKey]: g })))
      .catch(() => {});
  }, [mKey]);

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

  // ── Estágios do funil derivados ──────────────────────────────────────
  const funnelStages = useMemo<FunnelStage[]>(() => {
    if (!funnelRaw) return [];
    const { lead_novo, no_crm, em_tratamento, proposta, ganho } = funnelRaw;
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
      },
    ];
  }, [funnelRaw, k, monthGoals]);

  // ── Skeleton de carregamento ─────────────────────────────────────────
  if (!k) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">C</div>
            <div>
              <div className="brand-name">Caveo · Analyst AI</div>
              <div className="brand-sub">carregando dados…</div>
            </div>
          </div>
        </header>
        <main className="main">
          <div className="kpi-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="loading-shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 10, width: "60%" }} />
                <div className="loading-shimmer" style={{ height: 28, borderRadius: 6, width: "80%" }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const dayCount = timelineDays.length;

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
      />

      <main className="main">
        <div className="section-head">
          <h2 className="section-title">
            <Target size={14} /> Visão geral · {dayCount} dias do funil
          </h2>
          <span className="section-sub">
            {dataMode === "live" ? "Dados em tempo real via API" : dataMode === "mock" ? "Dados mockados · configure credenciais" : "Carregando…"}
          </span>
        </div>

        <div className="kpi-grid">
          <KpiCard label="Investimento total" value={k.invest} format="brl" icon={Wallet} goal={monthGoals.invest} goalType="max" hasProgress fullBrl />
          <KpiCard label="Volume de leads" value={k.leads} format="num" icon={Users} goal={monthGoals.leads} goalType="min" hasProgress />
          <KpiCard label="Custo por lead" value={k.cpl} format="brl" icon={Coins} goal={monthGoals.cpl} goalType="max" />
          <KpiCard label="Oportunidades" value={k.oport} format="num" icon={Filter} goal={monthGoals.oport} goalType="min" hasProgress />
          <KpiCard label="Custo por oportunidade" value={k.cpo} format="brl" icon={Coins} goal={monthGoals.cpo} goalType="max" />
          <KpiCard label="Tx. conv. Oport→Ganho" value={k.tx_conv} format="pct" icon={Repeat} goal={monthGoals.tx_conv} goalType="min" />
          <KpiCard label="Fechamentos · Ganho" value={k.ganho} format="num" icon={Trophy} goal={monthGoals.ganho} goalType="min" hasProgress />
          <KpiCard label="Custo por fechamento" value={k.cpf} format="brl" icon={Coins} goal={monthGoals.cpf} goalType="max" />
          <KpiCard label="Oportunidades perdidas" value={k.oport_perdidas} format="num" icon={TrendingDown} goal={monthGoals.oport_perdidas} goalType="max" />
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3 className="section-title"><Filter size={13} /> Funil de conversão</h3>
              <div className="section-sub" style={{ marginTop: 3 }}>
                Fluxo Lead Novo → No CRM → Em Tratamento → Proposta → Fechado Ganho · taxas com semáforo de benchmark
              </div>
            </div>
            <span className="section-sub">Fonte · Salesforce + UTM por plataforma</span>
          </div>
          <Funnel stages={funnelStages} lost={k.oport_perdidas} totalInvest={k.invest} />
        </section>

        <TimelineChart days={timelineDays} platform={platform} />

        <CampaignsTable rows={campaigns} platform={platform} search={search} onSearch={setSearch} dayCount={dayCount} />

        <footer style={{ textAlign: "center", padding: "10px 0 0", fontSize: 11, color: "var(--c-text-faint)" }}>
          {dataMode === "live" ? "Dashboard ao vivo · Next.js · porta :3000" : "Dashboard local · dados mockados"} · Caveo Analyst AI
        </footer>
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
