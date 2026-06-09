"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fmtMonth } from "@/lib/format";
import type { Goals } from "@/lib/types";

interface MetricDef {
  slug: string;
  name: string;
  desc: string;
  prefix: "R$" | "%" | "";
}

const METRICS: MetricDef[] = [
  { slug: "invest", name: "Investimento Total", desc: "Budget máximo do mês", prefix: "R$" },
  { slug: "leads", name: "Volume de Leads", desc: "Mínimo de conversões", prefix: "" },
  { slug: "cpl", name: "Custo por Lead (CPL)", desc: "Teto aceitável", prefix: "R$" },
  { slug: "oport", name: "Oportunidades", desc: "Volume mínimo", prefix: "" },
  { slug: "cpo", name: "Custo por Oportunidade", desc: "Teto aceitável", prefix: "R$" },
  { slug: "tx_conv", name: "Tx Conv. Oport→Ganho", desc: "Mínimo, em %", prefix: "%" },
  { slug: "ganho", name: "Fechamentos (Ganho)", desc: "Volume mínimo", prefix: "" },
  { slug: "cpf", name: "Custo por Fechamento", desc: "Teto aceitável", prefix: "R$" },
  { slug: "oport_perdidas", name: "Oportunidades Perdidas", desc: "Teto aceitável", prefix: "" },
];

export function GoalsDialog({
  open, onOpenChange, monthKey, goals, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  monthKey: string;
  goals: Goals;
  onSave: (g: Partial<Goals>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (open) setDraft({ ...goals });
  }, [open, goals]);

  const update = (slug: string, val: string) =>
    setDraft((d) => ({ ...d, [slug]: val === "" ? null : parseFloat(val) }));

  const save = () => {
    const clean: Partial<Goals> = {};
    for (const [k, v] of Object.entries(draft)) if (v != null) clean[k] = v;
    onSave(clean);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-lg" showCloseButton>
        <DialogHeader className="border-b px-6 pb-4 pt-5 text-left" style={{ borderColor: "var(--c-border)" }}>
          <DialogTitle style={{ fontSize: 16, letterSpacing: "-0.01em" }}>Metas de {fmtMonth(monthKey)}</DialogTitle>
          <DialogDescription style={{ fontSize: 12 }}>
            As metas configuradas alimentam as barras de progresso e os semáforos dos KPIs.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-1 pt-2">
          {METRICS.map((m) => (
            <div className="goal-row" key={m.slug}>
              <div className="goal-info">
                <div className="name">{m.name}</div>
                <div className="desc">{m.desc}</div>
              </div>
              <div className="goal-input">
                {m.prefix === "R$" && <span className="prefix">R$</span>}
                <input
                  type="number"
                  step="any"
                  value={draft[m.slug] ?? ""}
                  placeholder="—"
                  onChange={(e) => update(m.slug, e.target.value)}
                />
                {m.prefix === "%" && <span className="prefix" style={{ paddingRight: 10, paddingLeft: 0 }}>%</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: "var(--c-border)", background: "var(--c-bg-deep)" }}>
          <button className="btn btn-ghost" onClick={() => onOpenChange(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={save}>
            <Check size={14} />
            Salvar metas
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
