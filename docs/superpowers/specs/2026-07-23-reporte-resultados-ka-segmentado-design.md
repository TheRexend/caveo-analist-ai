# Reforma da skill `/reporte-resultados-ka` — reporte mensal segmentado RF/MM

> Design validado em brainstorming. Data: 2026-07-23.
> Reformula a skill existente `reporte-resultados-ka` (mantém `name` e comando)
> para deixar de preencher a aba agregada "Banco de Dados (interno)" e passar a
> alimentar, segmentado por RF e MM, as abas **"Mês-a-Mês RF"** e
> **"Mês-a-Mês MM"** da planilha de resultados.

## 1. Objetivo e escopo

A skill coleta Meta Ads + Google Ads + Salesforce do **mês corrente até D-1** e
grava os **inputs secos da coluna do mês (Realizado)** das duas abas segmentadas.
Só preenche os inputs; todas as fórmulas derivadas (Investimento Total, CPL, CPC,
CPM, CTR, Custo/Opp, Custo por SQL, Custo por Venda, Ticket Médio, ROAS, taxas de
conversão) recalculam sozinhas.

**Cadência:** sob demanda, **sobrescrevendo** a coluna do mês a cada rodada
(snapshot vivo do mês corrente). Não é append-only.

**Fora de escopo:** a antiga aba "Banco de Dados (interno)" — toda a lógica dela
(células A2/A5/A8/A11/A13/A16, blocos Awareness antigos, e o bug do nome de aba
`'Banco de Dados'` vs `'Banco de Dados (interno)'`) é **removida** da skill.

## 2. Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` (MCC `5029399396`) |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw` ("[CAVEO] Planilha de Resultados - Inside Sales") |
| Abas-alvo | `Mês-a-Mês RF`, `Mês-a-Mês MM` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |

## 3. Fundação (fonte única de regras)

Nada de listas próprias — tudo vem de `docs/fundacao-dados.md`
(gerado de `config/business-rules.ts`):

- **Canal pago (Meta/Google):** modelo **cpc + cruzamento**, fuso `-03:00`.
  `[FILTRO_META]` = `(cpcExpr('meta') OR cruzExpr('meta'))`; idem Google.
- **Segmento (RF/MM):** `classifyContratante(TipCte__c, Tempo_de_Formado__c)`
  (§4). Opp com `TipCte__c` nulo → `null` → **fora de RF e MM** (descartada).
- **MQL / SQL:** `QUALIFICATION_RULES` (§7), cumulativo via `OpportunityHistory`.
- **Ganho:** `WON_CLAUSE` = `(IsWon = true OR StageName = 'Ganho não Identificado')` (§3).
- **Duas datas:** entrada de funil por `CreatedDate`; fechamento por
  `LastStageChangeDate` (§5).
- **Rateio de institucional:** `SEGMENT_ALLOCATION` (§8) — rateia por participação
  de opps do segmento na campanha; fallback 50/50.

## 4. Estrutura das abas (mapa de células — idêntico em RF e MM)

Cada aba tem layout idêntico. A coluna de escrita é a coluna **Realizado do mês
corrente** (ver §5 — resolvida dinamicamente, aqui referida como `<COL>`).

**22 inputs secos por aba** (o resto da coluna é fórmula — NÃO tocar):

### Blocos de mídia (18 inputs)

| Bloco | Investimento | Impressões | Cliques | Leads |
|---|---|---|---|---|
| Google Search | `<COL>4` | `<COL>5` | `<COL>6` | `<COL>9` |
| Google YT/PMax/Display | `<COL>12` | `<COL>13` | `<COL>15` | `<COL>18` |
| Meta captação | `<COL>21` | `<COL>22` | `<COL>24` | `<COL>27` |
| Meta Awareness | `<COL>30` | `<COL>31` | — | `<COL>33` (Engajamentos) |
| Google Awareness | `<COL>35` | `<COL>36` | — | `<COL>38` (Engajamentos) |

### Funil Salesforce (4 inputs)

| Linha | Rótulo (A) | Célula | Definição | Data-base |
|---|---|---|---|---|
| 43 | Oportunidades MQL* | `<COL>43` | opps que atingiram gate MQL, mídia paga, segmentadas | `CreatedDate` no mês |
| 46 | Proposta Enviada SQL* | `<COL>46` | opps que atingiram *Proposta Enviada* (`sql_day`), mídia paga | `CreatedDate` no mês |
| 49 | Vendas | `<COL>49` | fechamentos ganho (`WON_CLAUSE`), mídia paga | `LastStageChangeDate` no mês |
| 52 | Faturamento | `<COL>52` | `SUM(Amount)` das vendas de `<COL>49` | `LastStageChangeDate` no mês |

\* Rótulos variam entre abas (RF: "Oportunidades MQL" / "Proposta Enviada SQL";
MM: "Oportunidades" / "Propostas Enviadas SQL"). Ambas gravam **MQL** e **SQL**
do respectivo segmento — o mapeamento é por número de linha, não por rótulo.

### Fórmulas derivadas (NÃO escrever — recalculam sozinhas)

`<COL>3` (Invest Total), `<COL>7/8/10/11` (CTR/CPC/CPL/T.Conv Search),
`<COL>14/16/17/19/20`, `<COL>23/25/26/28/29`, `<COL>32/34`, `<COL>37/39`,
`<COL>40/41/42` (Leads totais / CPL total / T.Conv), `<COL>44/45` (Custo/Opp,
T.Conv Leads/Opp), `<COL>47/48` (Custo/SQL, T.Conv Leads/SQL), `<COL>50/51`
(Custo/Venda, T.Conv Opp/Vendas), `<COL>53/54` (Ticket Médio, ROAS).

## 5. Resolução dinâmica da coluna do mês (segurança anti-sobreposição)

A coluna **não é fixa**. Cada mês, de maio/26 em diante, ocupa um trio
`Realizado | Meta | Δ%`; as colunas *Realizado* andam de 3 em 3
(H=mai, K=jun, N=jul, Q=ago, T=set…). A linha 1 guarda o 1º dia do mês como
número de série na coluna *Realizado*; a linha 2 marca `Realizado`. **Meses
futuros não pré-existem** na planilha.

**Função pura (helper, testada):**
`resolve_realizado_column(row1, row2, ano, mes) -> int | None`
1. Para cada coluna `i`: se `row2[i] == "Realizado"` e `row1[i]` é numérico,
   converter o serial → data (época Sheets `1899-12-30`) e comparar `ano`+`mes`.
2. Retorna o índice (1-based) da coluna correspondente, ou `None`.

**Comportamento na skill (Fase 0.5, antes de qualquer gravação):**
- **Achou** → exibe e **pede confirmação explícita**:
  `Mês corrente: <mês>/<ano> → gravar na coluna <COL> (Realizado) das abas RF e MM. Confirma?`
  Só prossegue após "sim".
- **Não achou** (mês novo sem trio de colunas) → **PARA e não grava nada**:
  avisa que a coluna do mês não existe e pede para criar o bloco do mês ou
  informar a coluna manualmente.
- **Guarda:** RF e MM devem resolver para a **mesma** coluna (cabeçalhos
  idênticos); se divergirem, para.

## 6. Universo de campanhas e classificação

**Universo:** apenas campanhas com o **marcador da agência "BOO"**. O marcador
aparece diferente por plataforma — `[BOO]` no Meta, `BOO -` no Google — então o
teste é *contém "boo"* (case-insensitive), que casa os dois formatos. Campanhas
sem o marcador (ex.: `comunidade_campanha_webinar…`) ficam **de fora**.

> **Registro:** o filtro "BOO" hoje também exclui as campanhas "Turbo"
> (pausadas). Sem impacto no mês corrente (gasto zero); se "Turbo" voltar a
> rodar como captação médico, revisar o universo.

**Bloco de cada campanha** — `block_of(name, channel_type)`:

| Bloco | Regra |
|---|---|
| `google_search` | Google, `advertising_channel_type = SEARCH`, não-topo |
| `google_yt_pmax` | Google, channel ∈ {`PERFORMANCE_MAX`,`DISPLAY`,`VIDEO`,`DEMAND_GEN`}, não-topo |
| `meta_captacao` | Meta, objetivo de leads, sem `[TOPO]` |
| `meta_awareness` | Meta com `[TOPO]` |
| `google_awareness` | Google com `[TOPO]` / DemandGen de topo |
| `excluded` | sem marcador BOO ou fora dos casos acima |

**Segmento de cada campanha** — reusa `segments.classify_segment(name)`:
`[RF]`/`[MM]` → `rf`/`mm`; sem tag → `institucional` (entra em rateio).

## 7. Rateio de campanhas institucionais

Campanha BOO médico sem tag `[RF]`/`[MM]` (ex.: Google `BOO - [Search] -
Institucional`): investimento/impressões/cliques/leads rateados por participação
de opps do segmento naquela campanha no período, via
`segments.allocate(name, spend, leads, opp_mm, opp_rf)` (fallback 50/50 quando
não há opps). O par `(opp_mm, opp_rf)` vem de uma consulta SF de opps por
`UtmCam__c` (mídia paga) no período, classificadas por `classifyContratante`.
Rateios que caírem no fallback 50/50 são **sinalizados no preview**.

> Impressões e cliques (que `allocate` hoje não trata) seguem o **mesmo ratio**
> calculado para o spend — estender o rateio para essas duas métricas ou aplicar
> o ratio no corpo da skill (decidir na implementação; manter a lógica de ratio
> num só lugar).

## 8. Métricas por campo (a validar na 1ª rodada conjunta)

- **Meta:** `spend`; `impressions`; `link_clicks` (Cliques); `actions[lead]`
  (Leads); Engajamentos = `actions[post_engagement]`.
- **Google:** `cost_micros / 1e6`; `impressions`; `clicks`; `conversions`
  (Leads, arredondado a inteiro); Engajamentos = `metrics.engagements`.
- **Awareness** (Meta e Google): hoje ≈ 0 (sem campanhas de topo ativas); a skill
  automatiza mesmo assim e grava 0.
- **Faturamento:** `Opportunity.Amount` (confirmado: julho/26 pago retornou
  49 vendas / R$ 147.000).

## 9. Arquitetura (helper Python testável)

Novo pacote **`scripts/reporte_ka/`**, no padrão de `scripts/acompanhamento_diario/`:

| Arquivo | Conteúdo |
|---|---|
| `blocks.py` | `is_boo(name)`; `block_of(name, channel_type)` |
| `sheet.py` | `resolve_realizado_column(row1, row2, ano, mes)`; mapa linha→métrica por bloco; `cell_updates(col, values)`; `write_updates(ws, updates)` |
| `test_blocks.py` | `is_boo` casa `[BOO]` e `BOO -`; `block_of` cobre search/pmax/awareness/excluded |
| `test_sheet.py` | resolver acerta jul→N e devolve `None` p/ mês inexistente; mapa de células correto; guarda RF≠MM |
| `conftest.py` | ajuste de `sys.path` |

**Reuso (sem duplicar):** importa `classify_segment`/`allocate` de
`scripts/acompanhamento_diario/segments.py` e `mql_day`/`sql_day` de
`scripts/acompanhamento_diario/qualification.py` (adicionar o diretório ao
`sys.path`). Essas funções já são testadas e espelham a fundação.

## 10. Pipeline da skill (fases)

**Fase 0 — Período.** `START` = 1º dia do mês corrente; `END` = D-1 (`-03:00`).
Deriva `(ano, mes)` do `END`. Informa o período.

**Fase 0.5 — Resolver e confirmar a coluna do mês.** Lê cabeçalho (linhas 1–2)
das duas abas, roda `resolve_realizado_column`, aplica as guardas do §5 e
**pede confirmação explícita** da coluna. Sem confirmação → não grava.

**Fase 1 — Coleta (paralela):**
- 1A. Meta por campanha (`get_insights`, `level=campaign`, período) — spend,
  impressions, link_clicks, actions[lead], actions[post_engagement], objetivo.
- 1B. Google por campanha (`search_search`) — cost_micros, impressions, clicks,
  conversions, `advertising_channel_type`, `metrics.engagements`.
- 1C. SF — opps criadas no mês, mídia paga: campos de segmento
  (`TipCte__c`, `Tempo_de_Formado__c`), `UtmCam__c`, e `OpportunityHistory`
  (para MQL/SQL). Query de `(opp_mm, opp_rf)` por `UtmCam__c` para o rateio.
- 1D. SF — vendas: `WON_CLAUSE`, `LastStageChangeDate` no mês, mídia paga,
  com `Amount` e campos de segmento.

**Fase 2 — Cálculo (helper via Bash):** filtra BOO → `block_of` → agrega por
bloco; classifica/rateia RF/MM; MQL/SQL por coorte de `CreatedDate` (reached-gate
via `mql_day`/`sql_day` ≠ None); Vendas/Faturamento por `LastStageChangeDate`
segmentados por `classifyContratante`; descarta `TipCte__c` nulo.

**Fase 3 — Preview:** tabela dos 22 valores de cada aba + coluna-alvo confirmada
+ avisos (rateios 50/50; nº de vendas/faturamento sem TipCte não segmentados;
awareness zerado). Pede confirmação de gravação.

**Fase 4 — Gravação:** sobrescreve os 22 inputs da coluna `<COL>` nas duas abas
via gspread (`write_updates`). Só escreve inputs; nunca fórmulas.

## 11. Consequências e limites (registrar)

- **Duas datas por design:** MQL/SQL contam por mês de **criação**; Vendas e
  Faturamento por mês de **fechamento** — uma venda de julho pode vir de opp
  criada antes. É o padrão de report de vendas (igual dashboard/reporte-semanal).
- **Split de mídia ≠ split de SF:** linhas de mídia separam RF/MM pela **tag da
  campanha** (intenção); o funil SF separa pelo **`TipCte__c` declarado**. Não
  reconciliam 100% — esperado.
- **`Amount` sem valor / nulo:** venda sem `Amount` conta em Vendas mas não soma
  em Faturamento; sinalizar se relevante.
- **Awareness:** automatizado, mas ≈ 0 enquanto não houver campanhas de topo BOO.

## 12. Higiene de organização (guardião)

- Atualizar a `description` do frontmatter da skill para o novo propósito
  (mantendo `name: reporte-resultados-ka` e o comando).
- Atualizar `docs/projeto-mapa.md` (skill deixou de ser "cliente KA" agregado) e
  a memória `project_reporte_resultados_ka.md`.
- Sem mudança em `config/business-rules.ts` (só consumo) — `npm run docs:check`
  deve seguir verde.
