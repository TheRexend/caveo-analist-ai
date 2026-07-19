---
name: reporte-consolidado-mensal
description: Monta o relatório mensal consolidado da Caveo num só lugar — mídia paga (Meta+Google), funil do Salesforce (com coorte de fechamento) e comportamento GA4. Compõe as demais skills numa visão única. Use para o fechamento mensal completo em vez de rodar cada relatório separado.
---

# Skill: Reporte Consolidado Mensal — Caveo

Junta **mídia paga + funil/CRM + GA4** num relatório único do mês. Não
reimplementa coleta: **compõe** as skills existentes e delega a leitura aos
agentes.

## Fonte única de regras
Tudo de canal/estágio/contratante/coorte: **`docs/fundacao-dados.md`**.

## Dependência
A seção GA4 depende do MCP de GA4 (subprojeto 5). Sem ele, montar o relatório
**sem** a seção GA4 e sinalizar a ausência.

## Período
Mês corrente 01→D-1 (ou mês fechado, se pedido).

## Composição (rodar as partes e juntar)
1. **Mídia + funil** → coleta como em `planilha-resultados` (Meta+Google+SF,
   modelo cpc+cruzamento, duas datas).
2. **Coorte de fechamento** → via `reporte-coorte` (mês do fechamento × origem).
3. **GA4** → via `reporte-ga4` (visão geral + LPs).
4. **Leitura integrada** → acionar `analista-midia-paga-crm` (mídia+funil) e
   `ga4-analise` (site); o orquestrador **sintetiza numa conclusão única**.

## Formato de saída
```
RELATÓRIO MENSAL CAVEO — [Mês/Ano]

1. MÍDIA PAGA (Meta + Google)
   [Investimento, Leads, CPL, Oportunidades, Custo/Opp, Fechamentos por plataforma]

2. FUNIL (Salesforce)
   [no_crm → em tratamento → proposta → ganho/perdido; taxas de conversão]

3. COORTE DE FECHAMENTO
   [fechados no mês × mês de origem]

4. SÍTIO (GA4)
   [usuários/sessões/origem/orgânico×pago/LPs]  — ou "indisponível (MCP GA4)"

5. LEITURA INTEGRADA (síntese única)
   [o que puxou o resultado do mês, cruzando mídia + funil + site]

6. PLANO PARA O PRÓXIMO MÊS
   [2-4 ações priorizadas]
```

## Pontos de atenção
- Não recontar: reusar exatamente os filtros/queries das skills componentes.
- A síntese final é UMA conclusão integrada (não blocos soltos lado a lado).
