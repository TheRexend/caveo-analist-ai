---
name: reporte-ga4
description: Coleta e consolida as métricas de GA4 do sítio da Caveo num relatório (semanal ou mensal) — usuários, sessões, novos usuários, origem, orgânico×pago, brand×non-brand, páginas, engajamento, tempo médio, conversão; e por landing page tráfego/conversão/tempo/origem. Depende do MCP de GA4. Use para o reporte de comportamento do site.
---

# Skill: Reporte GA4 — Caveo

Relatório de comportamento no sítio via **Google Analytics 4**. Análise/leitura
pelo agente **`ga4-analise`**.

## Dependência
Requer o **MCP de GA4** (`mcps/ga4/` — subprojeto 5). Se não estiver
disponível/autorizado, avisar e **não inventar números**.

## Fase 0 — Período
Semanal (7d vs 7d anteriores) ou mensal (01→D-1). Confirmar antes de coletar.

## Fase 1 — Coleta (GA4 Data API via MCP)

### Visão geral
- Usuários · Sessões · Novos usuários
- Origem do tráfego (canal / source-medium)
- **Orgânico × Pago** (default channel grouping)
- **Brand × Non-brand** (busca contendo "caveo" vs. não — documentar o critério)
- Páginas mais acessadas
- Taxa de engajamento · Tempo médio no site · Conversão geral do site
- Principais jornadas *(aproximar por sequências de páginas mais comuns —
  path exploration completo não é trivial na Data API)*

### Landing Pages (`lp.caveo.com.br` / `lp2.caveo.com.br`)
- Tráfego por LP · Conversão por LP · Tempo médio na página
- Performance por origem do tráfego

## Fase 2 — Apresentação
```
REPORTE GA4 — [Período]

VISÃO GERAL
Usuários: [n] | Sessões: [n] | Novos: [n]
Orgânico × Pago: [x]% / [y]% | Brand × Non-brand: [x]% / [y]%
Engajamento: [x]% | Tempo médio: [mm:ss] | Conversão geral: [x]%
Top páginas: [lista]

LANDING PAGES
[LP | Tráfego | Conversão | Tempo médio | Melhor origem]

LEITURA (agente ga4-analise): [2-3 bullets]
PRÓXIMO PASSO: [ação]
```

## Pontos de atenção
- Documentar sempre o critério de brand × non-brand.
- Conversão GA4 (evento no site) ≠ Oportunidade (Salesforce) — não misturar.
- Para semanal, calcular variação vs. período anterior como no `reporte-semanal-caveo`.
