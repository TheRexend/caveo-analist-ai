// === Helpers de formatação e status (port de utils.jsx) ===

export const fmtBRL = (
  v: number,
  opts: { compact?: boolean; digits?: number } = {},
): string => {
  const { compact = false, digits = 0 } = opts;
  if (compact) {
    if (Math.abs(v) >= 1_000_000) return "R$ " + (v / 1_000_000).toFixed(1).replace(".", ",") + "M";
    if (Math.abs(v) >= 1_000) return "R$ " + (v / 1_000).toFixed(1).replace(".", ",") + "k";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
};

export const fmtNum = (v: number, digits = 0): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

export const fmtPct = (v: number, digits = 1): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

export const fmtDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export const fmtMonth = (ym: string): string => {
  const [y, m] = ym.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export const monthKey = (iso: string): string => iso.slice(0, 7);

// Dias no mês civil de uma data ISO (YYYY-MM-DD).
function daysInMonth(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Pró-rateia uma meta MENSAL pelos dias do período selecionado, somando a
 * fração de cada mês tocado pelo intervalo. Usar apenas em metas de VOLUME
 * (invest, leads, oport, ganho, oport_perdidas); metas de taxa/custo (cpl,
 * cpo, cpf, tx_conv) não devem ser pró-rateadas.
 *
 * `goalForMonth(ym)` devolve a meta mensal do mês "YYYY-MM" (ou undefined).
 * Retorna undefined se nenhum mês do intervalo tiver meta definida.
 */
export function prorateGoal(
  from: string,
  to: string,
  goalForMonth: (ym: string) => number | undefined,
): number | undefined {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  let total = 0;
  let anyGoal = false;
  const cur = new Date(start);
  while (cur <= end) {
    const ym = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const g = goalForMonth(ym);
    // limite superior do mês corrente dentro do intervalo
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const segEnd = monthEnd < end ? monthEnd : end;
    const daysInSeg =
      Math.round((segEnd.getTime() - cur.getTime()) / 86_400_000) + 1;
    if (g != null && !isNaN(g)) {
      anyGoal = true;
      total += g * (daysInSeg / daysInMonth(`${ym}-01`));
    }
    // avança para o 1º dia do próximo mês
    cur.setFullYear(cur.getFullYear(), cur.getMonth() + 1, 1);
    cur.setHours(0, 0, 0, 0);
  }
  return anyGoal ? total : undefined;
}

/** Verdadeiro quando o intervalo cobre exatamente um mês civil inteiro. */
export function isFullMonth(from: string, to: string): boolean {
  if (from.slice(0, 7) !== to.slice(0, 7)) return false;
  const [y, m] = from.split("-").map(Number);
  const firstDay = from.endsWith("-01");
  const lastDay = Number(to.slice(8, 10)) === new Date(y, m, 0).getDate();
  return firstDay && lastDay;
}

export type Status = "good" | "warn" | "bad" | "neutral";

// type "min" → quanto maior melhor; "max" → quanto menor melhor
export function statusFromGoal(actual: number, goal: number | undefined, type: "min" | "max"): Status {
  if (goal == null || isNaN(goal)) return "neutral";
  const ratio = actual / goal;
  if (type === "min") {
    if (ratio >= 1) return "good";
    if (ratio >= 0.75) return "warn";
    return "bad";
  }
  if (ratio <= 1) return "good";
  if (ratio <= 1.25) return "warn";
  return "bad";
}

// thresholds: [bad-max, warn-max] → <bad-max bad, entre warn, >warn-max good
export function convStatus(rate: number, thresholds: [number, number]): Status {
  if (rate > thresholds[1]) return "good";
  if (rate >= thresholds[0]) return "warn";
  return "bad";
}
