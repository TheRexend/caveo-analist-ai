# Skill `planilha-resultados-sexta` — substitui `planilha-resultados`

Data: 2026-08-21

## Problema

A skill `planilha-resultados` grava na planilha `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`
(aba `Relação de Leads`), segmentada por Médico/Formando. O Caveo passou a usar uma
planilha nova, `[CAVEO] | Nova Planilha de ROAS e Resultados - Inside Sales`
(`13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok`), com um modelo diferente
(dashboard mensal alimentado por uma tabela diária), e ela deve substituir a
skill antiga por completo.

## Escopo

**Dentro:** coletar Meta Ads + Google Ads (investimento, alcance/impressões,
cliques, leads) e Salesforce (MQL/SQL do dia) e gravar na aba
`Banco de dados - Inside Sales`; detectar virada de mês e limpar as linhas do
mês anterior (com confirmação) antes de escrever o mês novo.

**Fora:** TikTok Ads e Pinterest Ads (a Caveo não anuncia neles hoje — os
blocos existem só porque a planilha é um template genérico de ROAS, não
específico da Caveo); "Vendas"/"Receita"/"Ticket Médio" (preenchimento manual
do time comercial, sem célula correspondente no Banco de dados); metas
(coluna "Meta" da aba `Inside Sales`) e "Qtd dias do mês atual" (linha 5) —
ambos preenchimento manual mensal do cliente; segmentação Médico/Formando (a
aba não tem essa dimensão — todo número é o total de mídia paga atribuída).

A aba `Inside Sales` é 100% fórmula (`SUM` sobre `Banco de dados - Inside
Sales`) — a skill nunca escreve nela, só lê o rótulo do mês ativo (B1) para o
controle de virada de mês.

## Layout da aba "Banco de dados - Inside Sales" (fonte de verdade)

| Item | Valor |
|---|---|
| Planilha | `13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok` |
| Aba de escrita | `Banco de dados - Inside Sales` |
| Aba de leitura (mês ativo) | `Inside Sales`, célula `B1` (nome do mês em pt-BR maiúsculo, ex. `AGOSTO`) |
| Locale | `pt_BR` |
| Auth | `.claude/sheets_credentials.json` (service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`, já com acesso de Editor) |

Diferente do `dados-lp-caveo` (coluna A com data absoluta, tabela cresce sem
fim), aqui **a linha representa o dia-do-mês (1-31), fixo**: linha 3 é sempre
dia 1, linha 33 é sempre dia 31 (bloco Meta/GA4); linha 38 é dia 1, linha 68 é
dia 31 (bloco Google). O mesmo intervalo de linhas é reciclado todo mês — ver
"Virada de mês".

### Bloco Meta Ads + GA4 (linhas 3-33, uma por dia-do-mês)

| Chave | Coluna | Cabeçalho | Bloco |
|---|---|---|---|
| `meta_aw_invest` | B | Investimento | META ADS - AWERENESS |
| `meta_aw_alcance` | C | Alcance | META ADS - AWERENESS |
| `meta_aw_impressoes` | D | Impressões | META ADS - AWERENESS |
| `meta_aw_seguidores` | E | Seguidores | META ADS - AWERENESS |
| `meta_invest` | H | Investimento | META ADS - DEMAIS CAMPANHAS |
| `meta_alcance` | I | Alcance | META ADS - DEMAIS CAMPANHAS |
| `meta_impressoes` | J | Impressão | META ADS - DEMAIS CAMPANHAS |
| `meta_cliques` | K | Cliques no link | META ADS - DEMAIS CAMPANHAS |
| `meta_lpv` | L | Visualização da pg. destino | META ADS - DEMAIS CAMPANHAS |
| `meta_leads` | M | Leads | META ADS - DEMAIS CAMPANHAS |
| `meta_mql` | N | MQL | META ADS - DEMAIS CAMPANHAS |
| `meta_sql` | O | SQL | META ADS - DEMAIS CAMPANHAS |
| `ga4_sessoes` | R | Sessions | GA4 |

Colunas `A`, `G`, `Q` são "Day" (dia-do-mês, `1`-`31`) — escritas só ao criar
a linha (nunca existiam antes: hoje a tabela está inteiramente vazia). `F` e
`P` são espaçadores em branco, nunca escritos.

### Bloco Google Ads (linhas 38-68, uma por dia-do-mês)

| Chave | Coluna | Cabeçalho | Bloco |
|---|---|---|---|
| `google_search_invest` | B | Investimento | GOOGLE ADS - SEARCH |
| `google_search_impressoes` | C | Impressões | GOOGLE ADS - SEARCH |
| `google_search_cliques` | D | Cliques | GOOGLE ADS - SEARCH |
| `google_search_conv` | E | Conversões | GOOGLE ADS - SEARCH |
| `google_search_mql` | F | MQL | GOOGLE ADS - SEARCH |
| `google_search_sql` | G | SQL | GOOGLE ADS - SEARCH |
| `google_pmax_invest` | J | Investimento | GOOGLE ADS - PMAX |
| `google_pmax_impressoes` | K | Impressões | GOOGLE ADS - PMAX |
| `google_pmax_cliques` | L | Cliques | GOOGLE ADS - PMAX |
| `google_pmax_conv` | M | Conversões | GOOGLE ADS - PMAX |
| `google_pmax_mql` | N | MQL | GOOGLE ADS - PMAX |
| `google_pmax_sql` | O | SQL | GOOGLE ADS - PMAX |
| `google_dgen_invest` | R | Investimento | GOOGLE ADS - DGEN |
| `google_dgen_impressoes` | S | Impressões | GOOGLE ADS - DGEN |
| `google_dgen_cliques` | T | Cliques | GOOGLE ADS - DGEN |
| `google_dgen_conv` | U | Conversões | GOOGLE ADS - DGEN |
| `google_dgen_mql` | V | MQL | GOOGLE ADS - DGEN |
| `google_dgen_sql` | W | SQL | GOOGLE ADS - DGEN |

Colunas `A`, `I`, `Q` são "Day". `H` e `P` são espaçadores.

**"Conversões" carrega o papel de "Leads" do Google** — mesma convenção da
`planilha-resultados` atual (`metrics.conversions`, arredondado no fim, não
por campanha).

### Colunas fora do alcance da skill

TikTok Ads (linhas 74-104) e Pinterest Ads (linhas 109-139) — a aba `Inside
Sales` já tem fórmulas apontando pra lá, mas **nem o cabeçalho existe** no
Banco de dados hoje. A skill não cria nem escreve nesses blocos.

## Definições de métrica

### Meta Ads — `act_438086148409254`

Split Awareness × Demais Campanhas por `objective` nativo da campanha:
`OUTCOME_AWARENESS` → bloco Awareness; qualquer outro objective → bloco
Demais Campanhas. **Diferente da `planilha-resultados` atual**, que filtra
por tag `[LEADS]` no nome — aqui não há esse filtro: toda campanha
não-Awareness entra no total (hoje são as 2 campanhas `[LEADS]` ativas).

Hoje a conta **não tem nenhuma campanha `OUTCOME_AWARENESS` ativa** — o
bloco Awareness fica com `0` em investimento/alcance/impressões. `Seguidores`
não tem métrica equivalente em Meta Ads Insights (é dado de Page Insights,
API diferente) — grava `0` até existir uma campanha desse tipo para validar
a fonte certa.

- `meta_invest` = `spend` (Insights, nível campanha, `time_increment=1`)
- `meta_alcance` = `reach`
- `meta_impressoes` = `impressions`
- `meta_cliques` = `actions[action_type=link_click].value`
- `meta_lpv` = `actions[action_type=landing_page_view].value`
- `meta_leads` = `actions[action_type=complete_registration].value` (fallback
  `offsite_conversion.fb_pixel_complete_registration`) — mesma regra da
  fundação, "Registro Concluído" é a conversão principal.

### Google Ads — `3921127876`

Split Search/PMax/DGen por `campaign.advertising_channel_type` (`SEARCH`,
`PERFORMANCE_MAX`, `DEMAND_GEN` — confirmar o literal exato quando houver
campanha DGen ativa; hoje a conta só tem Search e PMax). Isso substitui o
`GOOGLE_UTMCAM_ALIAS` manual da `planilha-resultados` atual, que já estava
obsoleto (campanhas renomeadas).

- `*_invest` = `cost_micros / 1_000_000`
- `*_impressoes` = `metrics.impressions`
- `*_cliques` = `metrics.clicks`
- `*_conv` = `metrics.conversions` (arredondar no fim)

### Salesforce — MQL/SQL "do dia"

Mesmo modelo do `acompanhamento-diario-caveo`: dia da **primeira transição**
de `OpportunityHistory` que cruza o gate, via
`scripts/acompanhamento_diario/qualification.py` (`mql_day`/`sql_day`, sem
alteração). **Sem classificar segmento** — todas as oportunidades que batem
com `[FILTRO_META]`/`[FILTRO_GOOGLE]` da fundação (modelo cpc + cruzamento,
fuso `-03:00`) contam, independente de `TipCte__c`. Isso é mais simples que a
`planilha-resultados` atual: não importa `segments.py`, não descarta
Revalida/`None`.

Zero explícito: todo dia dentro do período processado grava `mql`/`sql` com
`0` quando não há ocorrência — mesma regra de ouro do `acompanhamento-diario-caveo`
(célula vazia = dia não processado; célula com `0` = processado, sem
ocorrência).

### GA4 — property `488647966`

`ga4_sessoes` = sessões totais do site por dia (sem filtro de página) — a
aba não indica que seja específico de uma LP. Se o cliente quiser sessões só
da landing page, ajustar depois.

## Cadência e virada de mês

Sob demanda. Preenche retroativo: do primeiro dia-do-mês sem dado até uma
data alvo (padrão hoje, ou `D-1`; override via `$ARGUMENTS` com uma data
`YYYY-MM-DD`). Detecção de linha vazia/parcial no mesmo espírito do
`dados-lp-caveo` (`build_date_row_map`/`pending_dates`/`partial_dates`), mas
mapeando por dia-do-mês (`1`-`31`) em vez de data absoluta na coluna A.

**Virada de mês (ação destrutiva — sempre com confirmação):**

1. Ler `Inside Sales!B1` (nome do mês ativo, ex. `AGOSTO`).
2. Comparar com o mês corrente (`pt-BR`, maiúsculo, sem acento removido —
   `JANEIRO`, `FEVEREIRO`, ..., `DEZEMBRO`).
3. Se diferente: avisar o usuário, pedir confirmação explícita, e só então
   limpar `A3:R33` e `A38:W68` do `Banco de dados - Inside Sales` e
   atualizar `Inside Sales!B1` para o mês novo — antes de coletar/gravar
   qualquer dado do mês novo.
4. Se igual: seguir direto para a coleta normal.

Nunca limpar sem essa confirmação — é a única operação destrutiva da skill.

## Retirada da `planilha-resultados`

Decisão: aposentar de vez.

- Remover `.claude/skills/planilha-resultados.md`.
- Remover `scripts/planilha_resultados/` (código + testes).
- Remover o comando de chat correspondente em `.claude/commands/`.
- Atualizar `docs/projeto-mapa.md` (trocar a entrada da skill antiga pela
  nova).
- Planilha `Relação de Leads` (`169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`)
  para de ser mantida por automação — fica congelada no último estado
  gravado. `Dados Landingpage` (mesma planilha, skill `dados-lp-caveo`)
  **não é afetada** — continua ativa normalmente.

## Estrutura de arquivos

- `.claude/skills/planilha-resultados-sexta.md` (procedimento, no formato das
  demais skills operacionais)
- `scripts/planilha_resultados_sexta/sheet.py` — lógica pura (mapa
  dia-do-mês→linha, `cell_updates`, detecção de virada de mês, payload de
  limpeza) + casca de I/O sobre `gspread`, no padrão de
  `scripts/dados_lp/sheet.py`
- `scripts/planilha_resultados_sexta/test_sheet.py`
- `.claude/commands/planilha-resultados-sexta.md` (invólucro fino)
- Atualizar `docs/projeto-mapa.md`

## Testes

Unitários sobre a lógica pura de `sheet.py`: mapa dia-do-mês → linha para os
dois blocos (base 3 e base 38), `cell_updates` (chave desconhecida é erro),
detecção de mês ativo × mês corrente (virada sim/não), payload de limpeza
(`A3:R33`, `A38:W68`) e o parênteses "Day" só é escrito ao criar linha nova
pela primeira vez.
