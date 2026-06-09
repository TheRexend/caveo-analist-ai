"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { RefreshCw, Settings2 } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import type { Platform } from "@/lib/types";

type DataMode = "live" | "mock" | "loading";

interface TopBarProps {
  platform: Platform;
  onPlatform: (p: Platform) => void;
  dateFrom: string;
  dateTo: string;
  onDates: (from: string, to: string) => void;
  onOpenGoals: () => void;
  onRefresh: () => void;
  currentMonthLabel: string;
  dataMode: DataMode;
}

const STATUS_TEXT: Record<DataMode, string> = {
  live: "sincronizado · dados em tempo real",
  loading: "carregando dados…",
  mock: "dados mockados · configure credenciais",
};

export function TopBar({
  platform, onPlatform, dateFrom, dateTo, onDates,
  onOpenGoals, onRefresh, currentMonthLabel, dataMode,
}: TopBarProps) {
  const segRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!segRef.current) return;
    const el = segRef.current.querySelector<HTMLElement>(`[data-val="${platform}"]`);
    if (el) {
      const parent = segRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setIndicator({ left: r.left - parent.left, width: r.width });
    }
  }, [platform]);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div>
          <div className="brand-name">Caveo · Analyst AI</div>
          <div className="brand-sub">
            <span className={`refresh-pulse${dataMode === "mock" ? " mock" : dataMode === "loading" ? " loading" : ""}`} />
            {STATUS_TEXT[dataMode]}
          </div>
        </div>
      </div>

      <div className="topbar-controls">
        <div className="seg" ref={segRef} role="tablist" aria-label="Filtro de plataforma">
          <span className="seg-indicator" style={{ left: indicator.left, width: indicator.width }} />
          <button className="seg-btn" data-val="all" aria-pressed={platform === "all"} onClick={() => onPlatform("all")}>
            Todas
          </button>
          <button className="seg-btn" data-val="google" aria-pressed={platform === "google"} onClick={() => onPlatform("google")}>
            <span className="seg-dot" style={{ background: "var(--c-google)" }} />
            Google Ads
          </button>
          <button className="seg-btn" data-val="meta" aria-pressed={platform === "meta"} onClick={() => onPlatform("meta")}>
            <span className="seg-dot" style={{ background: "var(--c-meta)" }} />
            Meta Ads
          </button>
        </div>

        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDates={onDates} />

        <button className="btn" onClick={onOpenGoals}>
          <Settings2 size={14} />
          Metas de {currentMonthLabel}
        </button>

        <button className="btn-icon" title="Atualizar dados" onClick={onRefresh}>
          <RefreshCw size={15} className={dataMode === "loading" ? "animate-spin" : ""} />
        </button>
      </div>
    </header>
  );
}
