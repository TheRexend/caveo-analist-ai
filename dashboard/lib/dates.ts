// Datas default = início do mês corrente → hoje (resolvido no servidor).
export function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${d}` };
}

export type Preset = "today" | "yesterday" | "last7" | "last14" | "thisMonth" | "lastMonth" | "custom";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case "today": {
      const t = fmtDate(now);
      return { from: t, to: t };
    }
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const t = fmtDate(y);
      return { from: t, to: t };
    }
    case "last7": {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      return { from: fmtDate(s), to: fmtDate(now) };
    }
    case "last14": {
      const s = new Date(now); s.setDate(s.getDate() - 13);
      return { from: fmtDate(s), to: fmtDate(now) };
    }
    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmtDate(s), to: fmtDate(now) };
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmtDate(s), to: fmtDate(e) };
    }
    default:
      return defaultRange();
  }
}

export function detectPreset(from: string, to: string): Preset {
  for (const p of ["today", "yesterday", "last7", "last14", "thisMonth", "lastMonth"] as Preset[]) {
    const r = presetRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}
