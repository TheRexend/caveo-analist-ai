---
name: detector-defeitos
description: Detecta criativos, públicos e campanhas com KPIs em "defeito" no período — CTR muito baixo, frequência extremamente alta, CPC alto, CPM extravagante. Sinaliza o que está queimando budget sem retorno, com o benchmark ao lado. Operada pelo agente analista-midia-paga-crm (usa os benchmarks dele). Use para achar rápido o que cortar ou ajustar.
---

# Skill: Detector de Defeitos — Caveo

Varre a conta procurando **criativos / públicos / campanhas com KPIs ruins** e
lista o que está queimando budget. Operada pelo agente
**`analista-midia-paga-crm`** — os limiares 🔴🟡🟢 vêm da tabela de benchmarks
dele (não redefinir aqui).

## Fonte única de regras
Canal/contratante: **`docs/fundacao-dados.md`**. Benchmarks: **agente analista**.

## KPIs de defeito (classificar pelos benchmarks do agente)
- **CTR muito baixo** (abaixo do 🔴 do benchmark por canal)
- **Frequência extremamente alta** (fadiga de público)
- **CPC muito alto**
- **CPM extravagante**
- (secundário) Lead→MQL muito baixo concentrado num item

## Fase 0 — Período e escopo
Período (default mês corrente 01→D-1), plataforma, nível de varredura
(campanha / conjunto/grupo / anúncio).

## Fase 1 — Coleta
- **Meta:** `get_insights` nos níveis `campaign`, `adset`, `ad` com
  `impressions, clicks, spend, ctr, cpc, cpm, frequency, actions`.
  Para público: `breakdowns` relevantes (idade/gênero/placement) quando útil.
- **Google:** `search` em `campaign` / `ad_group` / `ad_group_ad` com
  `metrics.ctr, average_cpc, cost_micros, impressions, clicks`.

## Fase 2 — Detecção
Para cada item, comparar cada KPI ao benchmark do canal (agente). Marcar
🔴 (defeito) / 🟡 (atenção). Ignorar itens 🟢. Ordenar por **budget desperdiçado**
(spend do item × severidade), para o topo ser o que mais custa.

## Formato de saída
```
DEFEITOS DETECTADOS — [Plataforma] | [Período]

🔴 CRÍTICOS (cortar/pausar já)
- [item] | CTR [x]% (🔴 <0,8%) | Freq [x] | CPC R$.. | CPM R$.. | Spend R$..
  → causa provável: [fadiga / público errado / criativo fraco / lance alto]

🟡 ATENÇÃO (ajustar)
- [item] | [KPI fora + benchmark]

RESUMO: R$ [total] em itens 🔴 no período. Ação sugerida: [pausar X, revisar Y].
```

Quando o defeito for de **comunicação** (CTR baixo + criativo específico), emitir
`HANDOFF → criativos`. Quando parecer **fadiga** (frequência alta), sugerir
rotação/novo público antes de cortar.
