"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Moon, RefreshCw, Settings2, Sun } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import type { Theme } from "@/lib/use-theme";
import type { Contratante, Platform } from "@/lib/types";

type DataMode = "live" | "mock" | "loading";

interface TopBarProps {
  platform: Platform;
  onPlatform: (p: Platform) => void;
  contratante: Contratante;
  onContratante: (c: Contratante) => void;
  dateFrom: string;
  dateTo: string;
  onDates: (from: string, to: string) => void;
  onOpenGoals: () => void;
  onRefresh: () => void;
  currentMonthLabel: string;
  dataMode: DataMode;
  theme: Theme;
  onToggleTheme: () => void;
}

const STATUS_TEXT: Record<DataMode, string> = {
  live: "sincronizado · dados em tempo real",
  loading: "carregando dados…",
  mock: "dados mockados · configure credenciais",
};

interface SegOption<T extends string> {
  val: T;
  label: string;
  dot?: string;
  ariaLabel?: string;
}

/** Segmented control com indicador deslizante (reusado p/ plataforma e contratante). */
function Segmented<T extends string>({
  value, options, onChange, ariaLabel,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current.querySelector<HTMLElement>(`[data-val="${value}"]`);
    if (el) {
      const parent = ref.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setIndicator({ left: r.left - parent.left, width: r.width });
    }
  }, [value, options]);

  return (
    <div className="seg" ref={ref} role="tablist" aria-label={ariaLabel}>
      <span className="seg-indicator" style={{ left: indicator.left, width: indicator.width }} />
      {options.map((o) => (
        <button
          key={o.val}
          className="seg-btn"
          data-val={o.val}
          role="tab"
          aria-label={o.ariaLabel ?? o.label}
          aria-selected={value === o.val}
          onClick={() => onChange(o.val)}
        >
          {o.dot && <span className="seg-dot" style={{ background: o.dot }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PLATFORM_OPTS: SegOption<Platform>[] = [
  { val: "all", label: "Todas", ariaLabel: "Todas as plataformas" },
  { val: "google", label: "Google Ads", dot: "var(--c-google)" },
  { val: "meta", label: "Meta Ads", dot: "var(--c-meta)" },
];

const CONTRATANTE_OPTS: SegOption<Contratante>[] = [
  { val: "all", label: "Ambos", ariaLabel: "Ambos os públicos" },
  { val: "rf", label: "Recém-Formado" },
  { val: "mm", label: "Médicos Maduros" },
];

export function TopBar({
  platform, onPlatform, contratante, onContratante, dateFrom, dateTo, onDates,
  onOpenGoals, onRefresh, currentMonthLabel, dataMode, theme, onToggleTheme,
}: TopBarProps) {
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
        <Segmented<Platform> value={platform} options={PLATFORM_OPTS} onChange={onPlatform} ariaLabel="Filtro de plataforma" />
        <Segmented<Contratante> value={contratante} options={CONTRATANTE_OPTS} onChange={onContratante} ariaLabel="Filtro de público / contratante" />

        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDates={onDates} />

        <button className="btn" onClick={onOpenGoals}>
          <Settings2 size={14} />
          Metas de {currentMonthLabel}
        </button>

        <button
          className="btn-icon"
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button className="btn-icon" title="Atualizar dados" aria-label="Atualizar dados" onClick={onRefresh}>
          <RefreshCw size={15} className={dataMode === "loading" ? "animate-spin" : ""} />
        </button>
      </div>
    </header>
  );
}
