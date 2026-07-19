# Mapa do Projeto — Caveo Analyst AI (reformulado)

> Manifesto vivo / esqueleto do projeto. Consolida as decisões dos 6
> subprojetos da reformulação (specs em `docs/superpowers/specs/2026-07-16-*`).
> Serve de índice para o orquestrador (guardião de organização) e de onboarding.
> Data: 2026-07-16

## Status de implementação

| Subprojeto | Status |
|---|---|
| 1 — Fundação de dados | ✅ implementado e verificado (build/docs:check verdes) |
| 6 — Higiene e limpeza | ✅ rotas legadas, funções mortas, `.codex`, `scratch`, `.superpowers`, lockfile removidos |
| 2 — Agentes + orquestrador | ✅ 4 agentes + orquestrador (CLAUDE.md) + manifesto |
| 4 — Skills operacionais | ✅ 6 skills novas + 5 migradas + `.claude/commands/` (10 comandos) |
| 5 — MCPs locais | 🟡 estrutura pronta; **GA4 ATIVO** (venv + deps + credencial + `.mcp.json`, testado com dados reais, property `488647966`). Sheets = scaffold; google-ads/meta-ads/gtm ainda globais — ver `mcps/README.md` |
| 3 — Dashboard + GA4 | ✅ aba GA4 (dados reais) + melhorias B (coorte, validada), D (brand×non-brand Google), E (alertas de anomalia). Build + tsc verdes |

## Princípios estruturais

1. **Dashboard e camada agêntica são desacoplados.** Dashboard usa integrações
   diretas (`lib/integrations/*.ts`); agentes/skills usam MCPs. Nunca um chama
   o outro em runtime.
2. **Fonte única de regras de negócio** (`config/business-rules.ts`) → gera
   `docs/fundacao-dados.md`, lido pela camada agêntica; importado pelo dashboard.
3. **Tudo local ao projeto.** MCPs rodam de `mcps/` (exceto Firecrawl, remoto).
4. **Benchmarks vivem no agente** analista (decisão: não migraram p/ a fundação).

## Esqueleto (árvore de pastas)

```
caveo_analist_ai/
├── CLAUDE.md                          # + regras de roteamento do orquestrador
├── AGENTS.md · README.md · DEPLOY.md
├── .env.example                       # nomes de TODAS as env vars (MCPs + dashboard)
├── .env.local                         # (gitignored) segredos reais
├── .mcp.json                          # project-scoped; refs ${ENV_VAR}; caminhos locais
├── .gitignore                         # decisão de versionamento pendente (ver specs)
│
├── config/                            # ── FUNDAÇÃO · subprojeto 1 ──
│   ├── business-rules.ts              #   canal, cruzamento, estágio, contratante, duas datas, coorte
│   └── generate-docs.ts               #   gera docs/fundacao-dados.md + docs:check
│
├── .claude/
│   ├── agents/                        # ── AGENTES · subprojeto 2 ──
│   │   ├── analista-midia-paga-crm.md #   mídia + CRM/inside sales + diagnóstico de criativo
│   │   ├── criativos.md               #   ideação de conceitos (recebe handoff)
│   │   ├── tracking-conversoes.md     #   click IDs + server-side + GTM
│   │   └── ga4-analise.md             #   comportamento site/LP
│   ├── skills/                        # ── SKILLS · subprojeto 4 ──
│   │   ├── planilha-resultados.md      (procedimento)
│   │   ├── reporte-resultados-ka.md    (procedimento)
│   │   ├── reporte-semanal-caveo.md    (procedimento; aciona analista)
│   │   ├── reporte-ga4.md              (procedimento; novo)
│   │   ├── reporte-consolidado-mensal.md (procedimento; novo)
│   │   ├── reporte-coorte.md           (procedimento; novo)
│   │   ├── conversoes-oportunidade.md  (analítica → tracking)
│   │   ├── auditoria-tracking-gtm.md   (analítica → tracking; novo)
│   │   ├── criativos-campeoes.md       (analítica → analista; novo)
│   │   ├── detector-defeitos.md        (analítica → analista; novo)
│   │   └── brainstorming.md            (infra genérica)
│   ├── commands/                      # ── COMANDOS DE CHAT · subprojeto 4 ──
│   │   └── <um .md por skill>          #   invólucro fino → invoca a skill
│   ├── settings.json · settings.local.json
│   └── sheets_credentials.json        # (gitignored)
│
├── mcps/                              # ── MCPs LOCAIS · subprojeto 5 ──
│   ├── .venv/                          #   ambiente Python único do projeto
│   ├── salesforce/server.py            #   movido de .claude/
│   ├── gtm/                            #   vendorizado de ~/.claude/mcps/gtm
│   ├── ga4/server.py                   #   novo
│   └── sheets/server.py                #   novo
│                                       #   google-ads/meta-ads: pip no .venv → ./mcps/.venv/bin/*
│
├── app/                              # ── DASHBOARD · subprojeto 3 ──
│   ├── api/
│   │   ├── dashboard/route.ts          #   consolidado (mídia + funil)
│   │   ├── ga4/route.ts                #   novo (aba GA4)
│   │   ├── opportunities/route.ts      #   VIVO (drill-down do funil) — manter
│   │   ├── goals/route.ts · health/route.ts · debug/route.ts
│   │   # REMOVIDAS: metrics, funnel, timeline, campaigns (código morto)
│   ├── layout.tsx
│   └── page.tsx                        #   abas: Mídia+Funil / Sítio+GA4
├── components/
│   ├── (existentes: funnel, kpi-card, campaigns-table, timeline-chart, ...)
│   ├── cohort-chart.tsx                #   novo (coorte de fechamento)
│   ├── brand-nonbrand.tsx              #   novo (melhoria D)
│   ├── anomaly-alerts.tsx              #   novo (melhoria E)
│   └── ga4/                            #   novos componentes da aba GA4
├── lib/
│   ├── integrations/
│   │   ├── meta.ts · google.ts · goals.ts
│   │   ├── salesforce.ts               #   agora importa config/business-rules
│   │   └── ga4.ts                      #   novo (GA4 Data API direta p/ dashboard)
│   ├── cache.ts · types.ts · dates.ts · env.ts · ...
│
├── docs/
│   ├── projeto-mapa.md                 #   ESTE arquivo (manifesto vivo)
│   ├── fundacao-dados.md               #   GERADO de business-rules.ts
│   ├── data-catalog.md                 #   catálogo de campos MCP (Meta/Google/SF/GA4)
│   ├── superpowers/specs/              #   os 5 specs desta reforma
│   └── (estratégicos: personas_*, Dores_Desejos, LP_*, Google_Ads_*, ...)
│
├── scripts/                            # utilitários (md_to_docx, etc.)
├── outputs/                            # entregáveis gerados (apresentações)
└── scratch/                            # queries ad-hoc
```

## Índice de agentes (para roteamento do orquestrador)

| Agente | Aciona quando… | Não faz |
|---|---|---|
| `analista-midia-paga-crm` | performance de mídia, funil/CRM, atribuição, budget, diagnóstico de criativo | idear criativo, GA4, tracking |
| `criativos` | recebeu handoff de criativo ruim/bom; precisa idear conceito novo | analisar performance |
| `tracking-conversoes` | tracking/medição, click IDs, conversões server-side, GTM | análise de performance, budget |
| `ga4-analise` | comportamento no site/LP, jornada, origem GA4 | dados de plataforma de anúncio |

## Contrato de handoff
Bloco textual ao final da resposta do agente emissor; o orquestrador (raiz) lê e
aciona o destino. Ex.: `HANDOFF → criativos` / `HANDOFF → tracking-conversoes`.

## Decisões pendentes (fora do brainstorm, para retomar)
- **Versionamento:** hoje `docs/`, `.claude/`, `mcps/` etc. estão no `.gitignore`
  (só o dashboard vai ao GitHub). Revisar se a camada agêntica passa a ser
  versionada — `config/business-rules.ts` e `docs/fundacao-dados.md` viram
  dependências reais.
- **Search local vs. remoto:** Firecrawl (remoto) aceito como exceção ao
  "tudo local".
