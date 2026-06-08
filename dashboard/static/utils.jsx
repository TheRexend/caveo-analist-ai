// === Format helpers ===
const fmtBRL = (v, opts = {}) => {
  const { compact = false, digits = 0 } = opts;
  if (compact) {
    if (Math.abs(v) >= 1_000_000) return "R$ " + (v / 1_000_000).toFixed(1).replace(".", ",") + "M";
    if (Math.abs(v) >= 1_000) return "R$ " + (v / 1_000).toFixed(1).replace(".", ",") + "k";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(v);
};

const fmtNum = (v, digits = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(v);

const fmtPct = (v, digits = 1) =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(v);

const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const fmtMonth = (ym) => {
  const [y, m] = ym.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const monthKey = (iso) => iso.slice(0, 7);

// === Animated count-up hook ===
function useCountUp(value, opts = {}) {
  const { duration = 700, decimals = 0 } = opts;
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  const startRef = React.useRef(null);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);
    const target = value;

    const tick = (t) => {
      if (!startRef.current) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line
  }, [value]);

  return display;
}

// === Status (semáforo) helpers ===
// type: "min" → quanto maior melhor; "max" → quanto menor melhor
function statusFromGoal(actual, goal, type) {
  if (goal == null || isNaN(goal)) return "neutral";
  const ratio = actual / goal;
  if (type === "min") {
    if (ratio >= 1) return "good";
    if (ratio >= 0.75) return "warn";
    return "bad";
  }
  if (type === "max") {
    if (ratio <= 1) return "good";
    if (ratio <= 1.25) return "warn";
    return "bad";
  }
  return "neutral";
}

function convStatus(rate, thresholds) {
  // thresholds: [bad-max, warn-max] e.g. [0.10, 0.25] → <0.10 bad, 0.10-0.25 warn, >0.25 good
  if (rate > thresholds[1]) return "good";
  if (rate >= thresholds[0]) return "warn";
  return "bad";
}

// === Icons (inline svg) ===
const Icon = ({ name, size = 16 }) => {
  const paths = {
    wallet: <><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H5a2 2 0 0 1-2-2Z"/><path d="M3 7a2 2 0 0 1 2-2h11v4"/><circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none"/></>,
    users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M21 18c0-2.2-1.6-3.6-4-3.8"/></>,
    coin: <><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10c.5-1 3.5-1 3.5 0s-3 1-3 2 3 1 3 0"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3"/><path d="M10 14h4l1 4H9l1-4Z"/></>,
    bolt: <><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z"/></>,
    repeat: <><path d="M17 2v4l-4-2 4-2ZM3 12a8 8 0 0 1 13.6-5.7M21 12a8 8 0 0 1-13.6 5.7M7 22v-4l4 2-4 2Z"/></>,
    funnel: <><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z"/></>,
    decline: <><path d="M3 7l6 6 4-4 8 8"/><path d="M21 17v-4h-4"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    chevron: <><path d="m9 6 6 6-6 6"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
    check: <><path d="m5 12 5 5L20 7"/></>,
    download: <><path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"/></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></>,
    filter: <><path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    sort: <><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

Object.assign(window, { fmtBRL, fmtNum, fmtPct, fmtDate, fmtMonth, monthKey, useCountUp, statusFromGoal, convStatus, Icon });
