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
