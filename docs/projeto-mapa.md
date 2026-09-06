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

## Status — Reformulação de ICP (2026-07-31 em diante)

> Reforma **separada e posterior** à dos 6 subprojetos acima: RF/MM (segmento +
> recência) vira Formando/Médico/Revalida (`TipCte__c` direto); mídia paga
> passa a mirar 100% Médico. Specs em `docs/superpowers/specs/2026-07-31-*` e
> `2026-08-02-*`.

| Subprojeto | Status |
|---|---|
| 1 — Fundação de dados | ✅ `config/business-rules.ts`/`docs/fundacao-dados.md` migrados (`ContratanteKey`), `SEGMENT_ALLOCATION` removido |
| 2 — Camada agêntica | ✅ `segments.py` + 4 skills operacionais migradas; 2 planilhas reais renomeadas (abas Formando/Médico) |
| 3 — Dashboard | ✅ 100% Médico como funil principal; Formando vira indicador à parte; Meta/Google somam 100% das campanhas (sem filtro de tag de segmento); toggle "Somente Leads" |
| 4 — Docs estratégicos | ✅ personas/dores-desejos fundidas por estágio de carreira; Mapa temático de pilares de criativo + agente `criativos.md` atualizados; 16 docs/assets de RF/MM/mídia paga/LP arquivados em `docs/archive/` (inclui .docx/.html irmãos dos .md) |

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
│   │   ├── analista-criativo.md       #   framework de teste + cascata + hipóteses (DOE)
│   │   ├── criativos.md               #   ideação de conceitos (recebe handoff)
│   │   ├── tracking-conversoes.md     #   click IDs + server-side + GTM
│   │   └── ga4-analise.md             #   comportamento site/LP
│   ├── skills/                        # ── SKILLS · subprojeto 4 ──
│   │   ├── planilha-resultados-sexta.md (procedimento; diário sem segmentação → Banco de dados - Inside Sales; ex-planilha-resultados)
│   │   ├── reporte-resultados-ka.md    (procedimento; mensal segmentado Formando/Médico → abas Mês-a-Mês)
│   │   ├── reporte-semanal-caveo.md    (procedimento; aciona analista)
│   │   ├── reporte-ga4.md              (procedimento; novo)
│   │   ├── reporte-consolidado-mensal.md (procedimento; novo)
│   │   ├── reporte-coorte.md           (procedimento; novo)
│   │   ├── conversoes-oportunidade.md  (analítica → tracking)
│   │   ├── auditoria-tracking-gtm.md   (analítica → tracking; novo)
│   │   ├── criativos-campeoes.md       (analítica → analista; novo)
│   │   ├── criativos-semanal.md        (procedimento; semanal Meta → deck .pptx de 4 blocos)
│   │   ├── detector-defeitos.md        (analítica → analista; novo)
│   │   ├── acompanhamento-diario-caveo.md (procedimento; diário Médico/Formando; grava planilha)
│   │   ├── dados-lp-caveo.md           (procedimento; diário Meta+Google+SF+GA4 → aba Dados Landingpage)
│   │   ├── fechamentos-midia-paga-boomer.md (procedimento; SF Ganho cpc+cruzamento → upsert aba "Clientes Dash Boomer ")
│   │   ├── reconciliacao-fechamentos-caveo.md (procedimento; só leitura; planilha × Salesforce)
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
│   ├── superpowers/specs/              #   specs das duas reformas (6-subprojetos + ICP)
│   ├── personas_medico.md              #   4 personas (Larissa/Diego/Rafael/Camila), por estágio de carreira
│   ├── Dores_Desejos_Publicos_Caveo.md #   mapas D1-D7 em camadas, por estágio de carreira
│   ├── Mapa_Tematico_Pilares_Criativos_Caveo.md  #   pilares Oferta×Funcionalidades + guardrails de execução
│   ├── Manual_Comunicacao_Oferta_Caveo.md         # ⭐ MANUAL — regra de copy de oferta, portátil, sem timestamp
│   ├── Manual_Comunicacao_Funcionalidade_Caveo.md # ⭐ MANUAL — idem funcionalidade (5 regras invertem vs. oferta)
│   ├── DosDonts_Oferta_Roteiros_Caveo.md  #   ata/procedência da call 2026-08-03 (por que cada regra existe)
│   ├── DosDonts_Funcionalidade_Roteiros_Caveo.md  #   ata/procedência da call 2026-08-04 (pt2)
│   ├── Auditoria_Roteiros_v2_Caveo.md  #   auditoria dos 12 roteiros v2 contra os checklists (P0-P5, 2026-08-05)
│   ├── Auditoria_Criativos_PMax_Caveo.md  #   auditoria dos 8 estáticos PMax contra os manuais (P0-P3 + rodada 2 + versões corrigidas, 2026-08-07)
│   ├── Auditoria_LP_Oferta_Funcionalidade_Caveo.md  #   auditoria de copy de LP v1 (7 seções) contra os manuais + análise de CRO (P0-P3, 2026-08-10)
│   ├── Auditoria_LP_v2_Caveo.md        #   delta da LP v2 vs. a auditoria acima: 5 corrigidos, 9 pendentes, 8 novos + desvios do spec (2026-08-13)
│   ├── Auditoria_Estaticos_BigNumbers_Caveo.md  #   auditoria dos 5 estáticos de big numbers (R$100mi/500mil h/20mil médicos) — números não fecham entre si + CTA proibido em 5/5 (2026-08-19)
│   ├── BigNumbers_Conceitos_Caveo.md   # ⭐ banco de 6 ângulos de big number só com números já autorizados (plantão como moeda, R$0, 6 anos, 7 em cada 10, 72h×1min, ∞) + plano de teste (2026-08-19)
│   ├── Heros_LP_Medico_Caveo.md        # ⭐ 6 heroes p/ LP única (serve os 2 estados de PJ), escada de intensidade + plano de teste (2026-08-13) — substitui archive/Hero_Variacoes_Copy_LP_Caveo.md
│   ├── Hot_Topics_Busca_ICP_Caveo.md   # ⭐ demanda de busca do ICP por pilar (Oferta 5.460 × Func. 470/mês), pools sujos + negativas prontas, config de PMax (2026-08-07)
│   ├── Hot_Topics_Mercado_Employee_PJ_Caveo.md  # ⭐ mesmo levantamento para o mercado employee PJ (não-médico):
│   │                                            #   mercado 7,5x maior em busca mas sem marcador de ICP; cunha única =
│   │                                            #   desenquadramento MEI→ME; negativas + estrutura de campanha (2026-08-24)
│   ├── Slides_Hot_Topics_Busca_Business_Plan_Caveo.md  #   4 slides derivados do doc acima p/ a apresentação de business plan (2026-08-07)
│   ├── Transcricao_Alinhamento_Produto_Boomer_2026-07-30.md  #   fonte primária (call c/ cliente)
│   ├── matriz-poder-interesse-caveo.md · (demais estratégicos vigentes)
│   ├── business-plan-midia-paga-tam-sam-som.md  #   TAM/SAM/SOM + CAC teórico×real, base pra apresentação ao cliente (2026-08-03)
│   └── archive/                        #   16 docs/assets de RF/MM/mídia paga/LP pré-virada de ICP (histórico, aguardam releitura)
│
├── scripts/                            # utilitários (md_to_docx, etc.)
│   ├── dados_lp/                       #   helper da skill dados-lp-caveo (sheet.py + testes)
│   ├── clientes_dash_boomer/           #   helper da skill fechamentos-midia-paga-boomer (sheet.py + testes)
│   ├── criativos_semanal/              #   helper da skill criativos-semanal (puros + I/O + testes)
│   └── deck_caveo.py                   #   primitivas visuais compartilhadas dos decks
├── outputs/                            # entregáveis gerados (apresentações)
└── scratch/                            # queries ad-hoc
```

## Índice de agentes (para roteamento do orquestrador)

| Agente | Aciona quando… | Não faz |
|---|---|---|
| `analista-midia-paga-crm` | performance de mídia, funil/CRM, atribuição, budget, diagnóstico de criativo | idear criativo, GA4, tracking |
| `analista-criativo` | análise semanal de criativo, framework de teste (hook/hold/CTR/CPA), decidir escalar/iterar/matar, hipótese de teste | escrever copy, benchmark de funil |
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
