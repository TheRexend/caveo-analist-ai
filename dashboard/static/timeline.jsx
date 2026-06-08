// === Timeline (Chart.js) ===
function Timeline({ days, platform }) {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);
  const [granularity, setGranularity] = React.useState("day");
  const [ma7, setMa7] = React.useState(false);
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [activeMetrics, setActiveMetrics] = React.useState({
    invest: true,
    leads: true,
    oport: true,
    cpl: false,
    ganho: false
  });
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMetricsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const seriesConfig = {
    invest:  { label: "Investimento", color: "oklch(0.52 0.16 258)", axis: "y", format: v => fmtBRL(v, { compact: true }) },
    leads:   { label: "Leads",        color: "oklch(0.60 0.14 148)", axis: "y1", format: v => fmtNum(v) },
    oport:   { label: "Oportunidades",color: "oklch(0.72 0.15 72)",  axis: "y1", format: v => fmtNum(v) },
    cpl:     { label: "CPL",          color: "oklch(0.58 0.19 25)",  axis: "y", format: v => fmtBRL(v, { digits: 0 }) },
    ganho:   { label: "Fechamentos",  color: "oklch(0.45 0.12 280)", axis: "y1", format: v => fmtNum(v) }
  };

  const aggregated = React.useMemo(() => {
    // Filter platform + aggregate
    const agg = days.map(d => {
      let p;
      if (platform === "all") p = {
        invest: d.google.invest + d.meta.invest,
        leads: d.google.leads + d.meta.leads,
        oport: d.google.oport + d.meta.oport,
        ganho: d.google.ganho + d.meta.ganho
      };
      else p = { ...d[platform] };
      p.cpl = p.invest / Math.max(1, p.leads);
      return { date: d.date, ...p };
    });

    if (granularity === "month") {
      const buckets = {};
      agg.forEach(r => {
        const k = r.date.slice(0, 7);
        if (!buckets[k]) buckets[k] = { date: k + "-01", invest: 0, leads: 0, oport: 0, ganho: 0 };
        buckets[k].invest += r.invest;
        buckets[k].leads += r.leads;
        buckets[k].oport += r.oport;
        buckets[k].ganho += r.ganho;
      });
      return Object.values(buckets).map(b => ({ ...b, cpl: b.invest / Math.max(1, b.leads) }));
    }
    return agg;
  }, [days, platform, granularity]);

  const labels = aggregated.map(r => granularity === "day" ? fmtDate(r.date) : fmtMonth(r.date.slice(0, 7)));

  // Build datasets
  const datasets = [];
  Object.entries(activeMetrics).forEach(([key, on]) => {
    if (!on) return;
    const cfg = seriesConfig[key];
    let data = aggregated.map(r => r[key]);

    if (ma7 && granularity === "day") {
      const w = 7;
      data = data.map((_, i) => {
        const start = Math.max(0, i - w + 1);
        const slice = aggregated.slice(start, i + 1).map(r => r[key]);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      });
    }

    datasets.push({
      label: cfg.label,
      data,
      borderColor: cfg.color,
      backgroundColor: cfg.color.replace(")", " / 0.08)"),
      yAxisID: cfg.axis,
      tension: 0.32,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: cfg.color,
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
      fill: false
    });
  });

  React.useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets = datasets;
      chartRef.current.update();
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 500, easing: "easeOutCubic" },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "oklch(0.50 0.008 260)", font: { size: 11, family: "Geist Mono" }, maxRotation: 0, autoSkipPadding: 16 },
            border: { color: "oklch(0.86 0.005 95)" }
          },
          y: {
            position: "left",
            grid: { color: "oklch(0.94 0.005 95)", drawBorder: false },
            ticks: {
              color: "oklch(0.50 0.008 260)",
              font: { size: 11, family: "Geist Mono" },
              callback: v => fmtBRL(v, { compact: true })
            },
            border: { display: false }
          },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: {
              color: "oklch(0.50 0.008 260)",
              font: { size: 11, family: "Geist Mono" },
              callback: v => fmtNum(v)
            },
            border: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "oklch(0.18 0.005 260)",
            titleColor: "#fff",
            titleFont: { size: 12, weight: "600", family: "Geist" },
            bodyColor: "oklch(0.85 0.01 260)",
            bodyFont: { size: 12, family: "Geist Mono" },
            padding: 12,
            cornerRadius: 8,
            boxPadding: 6,
            displayColors: true,
            borderColor: "oklch(0.30 0.01 260)",
            borderWidth: 1,
            callbacks: {
              label: function (ctx) {
                const key = Object.entries(seriesConfig).find(([k, c]) => c.label === ctx.dataset.label)?.[0];
                const f = key ? seriesConfig[key].format : (v) => v;
                return "  " + ctx.dataset.label + ": " + f(ctx.parsed.y);
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  // eslint-disable-next-line
  }, [JSON.stringify(labels), JSON.stringify(activeMetrics), platform, granularity, ma7]);

  const toggleMetric = (k) => setActiveMetrics(m => ({ ...m, [k]: !m[k] }));

  return (
    <section className="timeline-card">
      <div className="timeline-toolbar">
        <div>
          <h3 className="section-title"><Icon name="bolt" size={13} /> Timeline de performance</h3>
          <div className="section-sub" style={{ marginTop: 3 }}>
            Investimento à esquerda · volumes à direita · tooltip unificado por dia
          </div>
        </div>

        <div className="timeline-controls">
          <label className={`toggle ${ma7 ? "on" : ""}`} onClick={() => setMa7(v => !v)} style={{ opacity: granularity === "day" ? 1 : 0.4, pointerEvents: granularity === "day" ? "auto" : "none" }}>
            <span className="toggle-switch"></span>
            MA 7d
          </label>

          <div className="seg" style={{ padding: 2 }}>
            <button className="seg-btn" style={{ padding: "4px 10px", fontSize: 12 }} aria-pressed={granularity === "day"} onClick={() => setGranularity("day")}>Diária</button>
            <button className="seg-btn" style={{ padding: "4px 10px", fontSize: 12 }} aria-pressed={granularity === "month"} onClick={() => setGranularity("month")}>Mensal</button>
          </div>

          <div className="dropdown" ref={dropdownRef}>
            <button className="btn" onClick={() => setMetricsOpen(v => !v)}>
              <Icon name="filter" size={13} />
              Métricas · {Object.values(activeMetrics).filter(Boolean).length}
              <Icon name="chevronDown" size={12} />
            </button>
            <div className={`dropdown-menu ${metricsOpen ? "open" : ""}`}>
              {Object.entries(seriesConfig).map(([k, cfg]) => (
                <div key={k} className={`dropdown-item ${activeMetrics[k] ? "checked" : ""}`} onClick={() => toggleMetric(k)}>
                  <span className="check">{activeMetrics[k] ? <Icon name="check" size={11} /> : null}</span>
                  <span className="swatch" style={{ background: cfg.color }}></span>
                  <span>{cfg.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
                    {cfg.axis === "y" ? "R$" : "vol"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-wrap">
        <canvas ref={canvasRef}></canvas>
      </div>

      <div className="legend-chips">
        {Object.entries(seriesConfig).map(([k, cfg]) => (
          <span
            key={k}
            className={`legend-chip ${activeMetrics[k] ? "active" : ""}`}
            onClick={() => toggleMetric(k)}
          >
            <span className="swatch" style={{ background: cfg.color }}></span>
            {cfg.label}
          </span>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { Timeline });
