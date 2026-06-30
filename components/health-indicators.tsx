"use client";
// Indicadores de saúde das integrações (Google Ads, Meta Ads, Salesforce).
// Faz ping em /api/health no mount, quando o usuário atualiza (refreshKey) e a
// cada 60s. Cada pill mostra bolinha verde (ok) / vermelha (fora) / cinza
// (sem credenciais) + tooltip com o estado e a latência.
import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api-client";
import type { HealthPayload, HealthStatus } from "@/lib/types";

const SERVICES = [
  { key: "google", label: "Google Ads" },
  { key: "meta", label: "Meta Ads" },
  { key: "salesforce", label: "Salesforce" },
] as const;

const POLL_MS = 60_000;

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok: "operacional",
  down: "instável / fora do ar",
  no_creds: "sem credenciais",
};

/** Classe CSS a partir do estado (evita o underscore de "no_creds"). */
function stateClass(s: HealthStatus | "loading"): string {
  return s === "no_creds" ? "nocreds" : s;
}

export function HealthIndicators({ refreshKey = 0 }: { refreshKey?: number }) {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    fetchHealth(signal)
      .then((h) => {
        if (signal?.aborted) return;
        setHealth(h);
        setLoading(false);
      })
      .catch(() => {
        if (signal?.aborted) return;
        setHealth(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    const id = setInterval(() => load(ctrl.signal), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [load, refreshKey]);

  return (
    <div className="health-bar" role="status" aria-label="Status das integrações">
      {SERVICES.map((s) => {
        const svc = health?.[s.key];
        const state = loading && !svc ? "loading" : svc?.status ?? "down";
        const desc = state === "loading" ? "verificando…" : STATUS_LABEL[state as HealthStatus];
        const lat = svc?.latencyMs != null ? ` · ${svc.latencyMs} ms` : "";
        return (
          <span
            key={s.key}
            className={`health-pill health-${stateClass(state)}`}
            title={`${s.label}: ${desc}${lat}`}
          >
            <span className="health-dot" />
            {s.label}
          </span>
        );
      })}
    </div>
  );
}
