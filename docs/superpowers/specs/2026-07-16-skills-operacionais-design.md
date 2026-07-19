# Skills Operacionais — Design

> Subprojeto 4 de 5 da reformulação do Caveo Analyst AI.
> Depende do subprojeto 1 (Fundação) e 2 (Agentes). Data: 2026-07-16

## Contexto

As 5 skills atuais reimplementam regras de UTM/estágio embutidas. Todas migram
para ler a fundação (`docs/fundacao-dados.md`), removendo as listas fixas.
Além disso, entram skills novas (relatórios GA4, consolidado, coorte, auditoria
de tracking) e duas skills analíticas de criativo/campanha.

## Princípio de fronteira: procedimento vs. analítica

- **Skill de procedimento** — coleta determinística + formatação. Roda na
  raiz/orquestrador, lê a fundação para os filtros. Não faz julgamento de
  benchmark.
- **Skill analítica** — depende de julgamento/benchmarks. Vive no domínio do
  **agente especialista** que é dono desses benchmarks. Como o usuário decidiu
  manter os benchmarks no agente (não na fundação), as skills que usam limiares
  são operadas pelo agente correspondente — assim os limiares ficam num lugar
  só.

## Elenco de skills

### Procedimento (rodam na raiz; leem a fundação)
| Skill | Estado | Observação |
|---|---|---|
| `planilha-resultados` | migra p/ fundação | + opção de coorte |
| `reporte-resultados-ka` | migra p/ fundação | cliente KA específico |
| `reporte-semanal-caveo` | migra p/ fundação | já aciona o analista na Fase 3 |
| `reporte-ga4` (novo) | — | coleta GA4 via MCP; semanal/mensal |
| `reporte-consolidado-mensal` (novo) | — | compõe mídia + funil + GA4 |
| `reporte-coorte` (novo) | — | fechamentos × mês de origem; lê regra de coorte da fundação |
| `brainstorming` | sem mudança | infra genérica |

### Analítica (operadas por um agente especialista)
| Skill | Operada por | Usa |
|---|---|---|
| `conversoes-oportunidade` | `tracking-conversoes` | fundação (canal pago) |
| `auditoria-tracking-gtm` (novo) | `tracking-conversoes` | MCP gtm + salesforce |
| `criativos-campeoes` (novo) | `analista-midia-paga-crm` | benchmarks do agente + MQL/SQL por criativo via `UtmCon__c`↔Salesforce |
| `detector-defeitos` (novo) | `analista-midia-paga-crm` | benchmarks do agente (CTR/freq/CPC/CPM) por criativo/público/campanha |

**Skill de campeões:** ranqueia criativos por oportunidades geradas + MQL/SQL,
para facilitar identificar a comunicação vencedora no período.
**Skill de detector de defeitos:** identifica criativos/públicos/campanhas com
KPIs ruins — CTR muito baixo, frequência extremamente alta, CPC alto, CPM
extravagante.

## Comandos de chat (`.claude/commands/`)

Cada skill ganha um slash command correspondente em `.claude/commands/<nome>.md`
— um invólucro fino que invoca a skill (as analíticas roteiam para o agente
dono). Permite disparar via chat: `/reporte-ga4`, `/criativos-campeoes`,
`/reporte-semanal`, `/detector-defeitos`, etc.

## Dependência de dados a validar na implementação

As skills de campeões/defeitos atribuem MQL/SQL **por criativo**, dependendo de
`UtmCon__c` (utm_content = conjunto/grupo de anúncios) estar preenchido no
Salesforce. Confirmar cobertura de `UtmCon__c` suficiente para ranquear antes
de confiar no ranking.

## Fora de escopo
- MCP de GA4 → subprojeto 5.
- Benchmarks na fundação → decidido manter no agente (não migra agora).
