"use client";
import { useState, useMemo } from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { detectPreset, presetRange, type Preset } from "@/lib/dates";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today",     label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last7",     label: "Últimos 7 dias" },
  { id: "last14",    label: "Últimos 14 dias" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
];

function fmtDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDates: (from: string, to: string) => void;
}

export function DateRangePicker({ dateFrom, dateTo, onDates }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const activePreset = useMemo(() => detectPreset(dateFrom, dateTo), [dateFrom, dateTo]);
  const presetLabel = PRESETS.find((p) => p.id === activePreset)?.label ?? "Personalizado";

  // noon local time avoids UTC-boundary shift when converting back
  const selected: DateRange = {
    from: dateFrom ? new Date(dateFrom + "T12:00:00") : undefined,
    to:   dateTo   ? new Date(dateTo   + "T12:00:00") : undefined,
  };

  function handleRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return;
    const toISO = (d: Date) => d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
    const from = toISO(range.from);
    const to   = range.to ? toISO(range.to) : from;
    onDates(from, to);
    if (range.to) setOpen(false);
  }

  function handlePreset(preset: Preset) {
    const r = presetRange(preset);
    onDates(r.from, r.to);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="drp-trigger">
        <CalendarIcon size={14} className="drp-trigger-icon" />
        <span className="drp-trigger-label">{presetLabel}</span>
        <span className="drp-trigger-range">
          {fmtDisplay(dateFrom)} – {fmtDisplay(dateTo)}
        </span>
        <ChevronDown size={12} className="drp-trigger-chevron" />
      </PopoverTrigger>

      <PopoverContent
        className="w-auto! p-0! gap-0! overflow-hidden! drp-popup"
        align="end"
        sideOffset={6}
      >
        {/* Header */}
        <div className="drp-popup-header">
          <span className="drp-popup-title">{presetLabel}</span>
          <span className="drp-popup-range">
            <CalendarIcon size={11} />
            {fmtDisplay(dateFrom)} – {fmtDisplay(dateTo)}
          </span>
        </div>

        {/* Body */}
        <div className="drp-popup-body">
          <nav className="drp-popup-presets" aria-label="Predefinições de data">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`drp-preset-btn${activePreset === p.id ? " is-active" : ""}`}
                onClick={() => handlePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <div className="drp-popup-cal">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleRangeSelect}
              locale={ptBR}
              defaultMonth={selected.from ?? new Date()}
              showOutsideDays={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="drp-popup-footer">
          Fuso horário: America/Sao_Paulo
        </div>
      </PopoverContent>
    </Popover>
  );
}
