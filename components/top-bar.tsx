"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, Moon, MoreHorizontal, RefreshCw, Sun, Target } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Theme } from "@/lib/use-theme";
import type { Platform } from "@/lib/types";

type DataMode = "live" | "mock" | "loading";

interface TopBarProps {
  platform: Platform;
  onPlatform: (p: Platform) => void;
  apenasLeads: boolean;
  onApenasLeads: (v: boolean) => void;
  cruzamento: boolean;
  onCruzamento: (v: boolean) => void;
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

/** Segmented control com indicador deslizante (usado para a plataforma). */
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

/** Dropdown de seleção única no estilo Caveo (usado para o público/contratante). */
function FilterDropdown<T extends string>({
  value, options, onChange, ariaLabel, icon: Icon,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.val === value) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="filter-dd-trigger" aria-label={ariaLabel}>
        {Icon && <Icon size={14} className="filter-dd-icon" />}
        {current.dot && <span className="seg-dot" style={{ background: current.dot }} />}
        <span className="filter-dd-label">{current.label}</span>
        <ChevronDown size={12} className="filter-dd-chevron" />
      </PopoverTrigger>
      <PopoverContent className="w-auto! p-1! gap-0! filter-dd-popup" align="start" sideOffset={6}>
        {options.map((o) => (
          <button
            key={o.val}
            className={`filter-dd-item${o.val === value ? " is-active" : ""}`}
            onClick={() => { onChange(o.val); setOpen(false); }}
          >
            {o.dot && <span className="seg-dot" style={{ background: o.dot }} />}
            <span className="filter-dd-item-label">{o.label}</span>
            {o.val === value && <Check size={14} className="filter-dd-check" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const PLATFORM_OPTS: SegOption<Platform>[] = [
  { val: "all", label: "Todas", ariaLabel: "Todas as plataformas" },
  { val: "google", label: "Google Ads", dot: "var(--c-google)" },
  { val: "meta", label: "Meta Ads", dot: "var(--c-meta)" },
];

export function TopBar({
  platform, onPlatform, apenasLeads, onApenasLeads, cruzamento, onCruzamento,
  dateFrom, dateTo, onDates, onOpenGoals, onRefresh, currentMonthLabel, dataMode, theme, onToggleTheme,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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

        <label
          className={`toggle toggle-apenas-leads${apenasLeads ? " on" : ""}`}
          title={apenasLeads ? "Mostrar todas as campanhas (desativar filtro [LEADS])" : "Mostrar só campanhas de geração de lead ([LEADS])"}
        >
          <input
            type="checkbox"
            checked={apenasLeads}
            onChange={(e) => onApenasLeads(e.target.checked)}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          <span className="toggle-switch" />
          Somente Leads
        </label>

        <label
          className={`toggle toggle-cruzamento${cruzamento ? " on" : ""}`}
          title={cruzamento ? "Desativar contagem de cruzamento (click ID)" : "Ativar contagem de cruzamento (click ID)"}
        >
          <input
            type="checkbox"
            checked={cruzamento}
            onChange={(e) => onCruzamento(e.target.checked)}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          <span className="toggle-switch" />
          Cruzamento
        </label>

        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDates={onDates} />

        <button className="btn-icon" title="Atualizar dados" aria-label="Atualizar dados" onClick={onRefresh}>
          <RefreshCw size={15} className={dataMode === "loading" ? "animate-spin" : ""} />
        </button>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger className="btn-icon" title="Opções" aria-label="Mais opções">
            <MoreHorizontal size={15} />
          </PopoverTrigger>
          <PopoverContent className="w-auto! p-1! gap-0! topbar-menu" align="end" sideOffset={6}>
            <button
              className="topbar-menu-item"
              onClick={() => { onOpenGoals(); setMenuOpen(false); }}
            >
              <Target size={14} className="topbar-menu-icon" />
              <span>Metas de {currentMonthLabel}</span>
            </button>
            <div className="topbar-menu-sep" />
            <button
              className="topbar-menu-item"
              onClick={onToggleTheme}
            >
              {theme === "dark" ? <Sun size={14} className="topbar-menu-icon" /> : <Moon size={14} className="topbar-menu-icon" />}
              <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
