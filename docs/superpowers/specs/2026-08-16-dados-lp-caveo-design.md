# Skill `dados-lp-caveo` — coleta diária da aba "Dados Landingpage"

Data: 2026-08-16

## Problema

A planilha `[CAVEO] Planilha de Resultados - Inside Sales` (`169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`)
tem uma aba `Dados Landingpage` preenchida à mão, dia a dia, com métricas de topo
de funil de Meta Ads, Google Ads e GA4. Hoje só a linha de 13/08/2026 está
preenchida; 14/08 e 15/08 já estão em atraso. O preenchimento manual é lento,
propenso a erro e não deixa registro da régua usada em cada coluna.

Esta skill automatiza a coleta e a gravação dessas dez colunas.

## Escopo

**Dentro:** coletar Meta Ads, Google Ads e GA4 para as datas pendentes e gravar
nas colunas C–F, H–K e M–N; estender a coluna A quando a data coletada ainda não
existir na tabela.

**Fora:** Salesforce, MQL/SQL, fechamentos, segmentação Médico/Formando,
análise ou interpretação dos números. Esta skill é coleta, não relatório.

## Layout da aba (fonte de verdade)

| Item | Valor |
|---|---|
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw` |
| Aba | `Dados Landingpage` (sem espaço entre "Landing" e "page") |
| Locale | `pt_BR` |
| Cabeçalho | linha 1 |
| Dados | linha 2 em diante; hoje até a linha 60 |
| Datas | coluna A, serial de data, consecutivas de 13/08/2026 (linha 2) a 10/10/2026 (linha 60) |
| Auth | `.claude/sheets_credentials.json` (service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`, já com acesso de Editor) |

### Colunas graváveis

| Chave | Coluna | Cabeçalho |
|---|---|---|
| `meta_impressoes` | C | Impressoes |
| `meta_cliques` | D | Cliques |
| `meta_leads` | E | Leads |
| `meta_invest` | F | investimento |
| `google_impressoes` | H | Impressoes |
| `google_cliques` | I | Cliques |
| `google_leads` | J | Leads |
| `google_invest` | K | investimento |
| `ga4_sessoes` | M | Sessões |
| `ga4_bounce` | N | Bounce Rate |

### Colunas proibidas

**B, G, L, O** são rótulos fixos repetidos em toda linha (`Meta Ads`,
`Google Ads`, `GA4`, `Total Geral`).

**P–W** são fórmulas do bloco Total Geral:

| Coluna | Fórmula (linha `r`) |
|---|---|
| P | `=H{r}+C{r}` |
| Q | `=I{r}+D{r}` |
| R | `=Q{r}/P{r}` |
| S | `=M{r}` |
| T | `=(K{r}+F{r})/S{r}` |
| U | `=S{r}/Q{r}` |
| V | `=J{r}+E{r}` |
| W | `=V{r}/S{r}` |

A skill **nunca** escreve em B, G, L, O ou P–W numa linha que já existe. A única
exceção é a criação de uma linha nova (ver "Extensão da coluna A"), onde esses
valores fazem parte do clone.

## Definições de métrica

Derivadas por reconciliação contra a linha 13/08/2026, a única preenchida
manualmente. Onde a conta fechou exata, a definição está provada.

### Meta Ads — `act_438086148409254`, todas as campanhas

| Coluna | Definição | Prova em 13/08 |
|---|---|---|
| C impressões | soma de `impressions` | 36.710 (planilha: 36.708, drift de 2) |
| D cliques | soma de `link_click` em `actions` | **344 = 344 exato** |
| E leads | soma de `lead` em `actions` | **12 = 12 exato** |
| F investimento | soma de `spend` | **2.339,59 = 2.339,59 exato** |

Duas armadilhas provadas pela reconciliação:

- **Cliques é `link_click`, não `clicks`.** O campo `clicks` daria 573 naquele
  dia, não 344.
- **Leads é `lead`, não `complete_registration`.** `complete_registration` daria
  9, não 12.

Nenhum filtro de campanha: entram todas as campanhas da conta, inclusive as com
gasto zero que registraram conversão (em 13/08, a campanha de remarketing
contribuiu com 1 lead e nada mais).

### Google Ads — `3921127876`, todas as campanhas

| Coluna | Definição |
|---|---|
| H impressões | soma de `metrics.impressions` |
| I cliques | soma de `metrics.clicks` |
| J leads | soma de `metrics.conversions`, arredondado ao fim |
| K investimento | soma de `metrics.cost_micros` / 1e6 |

Não existe equivalente de `link_click` no Google Ads; `clicks` é a régua.

A reconciliação de 13/08 fechou com ~0,4% de diferença em direções mistas
(planilha 56.623 / 3.340 / 140 / 3.651,51 contra API 56.642 / 3.322 / 136 /
3.635,67). A leitura é dado ainda assentando no momento da coleta manual, não
filtro diferente — e é a justificativa direta do escape hatch de regravação.

### GA4 — apenas `lp2.caveo.com.br`

| Coluna | Definição |
|---|---|
| M sessões | `sessions` do host `lp2.caveo.com.br` |
| N bounce rate | `bounceRate` do host `lp2.caveo.com.br`, em fração decimal |

Os hosts `lp.caveo.com.br` e `welcome.caveo.com.br` ficam **de fora**.

`bounceRate` é gravado como fração (`0,0088`), não como número percentual — a
célula N já está formatada como porcentagem e exibe `0,88%` sozinha.

### Divergência deliberada com `/acompanhamento-diario-caveo`

As duas skills leem as mesmas contas e **não vão bater**, de propósito:

| | `dados-lp-caveo` | `acompanhamento-diario-caveo` |
|---|---|---|
| Leads Meta | `lead` → 12 em 13/08 | `complete_registration` → 9 em 13/08 |
| Cliques Meta | `link_click` | não coleta |
| Escopo Meta | todas as campanhas | só campanhas `[LEADS]` |
| Segmento | nenhum | Médico / Formando |

Isso é uma escolha do cliente para esta aba, não um bug. A skill deve dizer isso
no próprio corpo para ninguém "consertar" a divergência depois.

## Arquitetura

Padrão dominante do repositório (`scripts/acompanhamento_diario/`,
`scripts/reporte_ka/`): skill em markdown orquestra os MCPs e um módulo Python
concentra a lógica pura testável mais uma casca fina de I/O.

### `scripts/dados_lp/sheet.py`

Constantes: `COLS` (mapa acima), `ROW_LABELS` (`{"B": "Meta Ads", "G": "Google
Ads", "L": "GA4", "O": "Total Geral"}`), `ROW_FORMULAS` (mapa de fórmulas acima,
com `{r}` a interpolar).

| Função | Tipo | Responsabilidade |
|---|---|---|
| `build_date_row_map(col_a)` | pura | `['Data', '13/08/2026', …]` → `{'2026-08-13': 2, …}`. Lê a coluna A de verdade em vez de assumir offset fixo — a aba pode ser estendida por fora. |
| `check_consecutive(date_row_map)` | pura | devolve os buracos na sequência diária. Não conserta nada. |
| `row_is_empty(grid_row)` | pura | `True` se as dez células graváveis estão vazias. |
| `pending_dates(date_row_map, grid, until)` | pura | datas ≤ `until` cuja linha existe e está totalmente vazia. |
| `missing_dates(date_row_map, until)` | pura | datas ≤ `until` posteriores à última data da coluna A, em sequência diária. |
| `append_rows_payload(first_new_row, dates)` | pura | para cada data nova: `A` + `ROW_LABELS` + `ROW_FORMULAS` reancoradas na linha. |
| `cell_updates(row, metrics)` | pura | `{chave: valor}` → `[(A1, valor)]` só das chaves presentes, na ordem de `COLS`. |
| `write_updates(ws, updates, value_input_option)` | I/O | `batch_update` do gspread. `USER_ENTERED` para o payload de linhas novas (data e fórmula precisam ser interpretadas), `RAW` para as métricas. |

`COLS` não contém B, G, L, O nem P–W, então `cell_updates` é estruturalmente
incapaz de escrever numa fórmula. Essa é a garantia principal do design.

### Fluxo da skill

**Fase 0 — Alvo.** `until = D-1`. `$ARGUMENTS` opcional aceita uma data
(`YYYY-MM-DD`) ou intervalo (`YYYY-MM-DD a YYYY-MM-DD`) e, nesse caso, **força a
regravação** daquelas linhas mesmo que já estejam preenchidas.

**Fase 1 — Reconhecimento da tabela.** Ler coluna A e o bloco C–N. Montar
`date_row_map` e rodar `check_consecutive`. A lista de datas-alvo sai de dois
caminhos mutuamente exclusivos:

- **sem `$ARGUMENTS`:** `pending_dates` (linhas existentes e vazias) mais
  `missing_dates` (datas que ainda não têm linha);
- **com `$ARGUMENTS`:** exatamente as datas pedidas, ignorando `pending_dates` —
  é assim que a regravação de uma linha já preenchida acontece. `missing_dates`
  continua valendo, para o caso de a data pedida ainda não ter linha.

Se não houver nada a fazer, dizer isso e parar.

**Fase 2 — Coleta.** Uma chamada por dia no Meta (o MCP ignora `time_increment`
e agrega o range — comportamento conhecido); uma chamada só no Google
(`segments.date BETWEEN`, agrupando por `segments.date`); uma chamada só no GA4
(dimensões `date` + `hostName`, filtrando `lp2.caveo.com.br` no cliente).

**Fase 3 — Preview.** Tabela data × dez métricas, **mais as células A1 exatas**
que serão gravadas, mais a lista de linhas que serão criadas. Pedir confirmação
explícita.

**Fase 4 — Gravação.** Primeiro `append_rows_payload` (cria as linhas novas
completas), depois as métricas. Nessa ordem, senão a métrica cai numa linha que
ainda não existe.

## Extensão da coluna A

Quando a data a coletar não existe na coluna A, a skill **cria a linha** e avisa.

Regras:

1. **Só no fim da tabela.** Extensão continua a sequência diária a partir da
   última data existente. Buraco no meio da sequência é **reportado como
   anomalia e interrompe a execução** — inserir linha no meio desloca as linhas
   seguintes e quebra as âncoras das fórmulas P–W.
2. **A linha nova é um clone completo**, nunca só a data: coluna A com a data,
   `ROW_LABELS` em B/G/L/O e `ROW_FORMULAS` reancoradas em P–W. Uma linha só com
   data deixaria o bloco Total Geral morto naquele dia.
3. **Aviso obrigatório.** O preview lista as linhas que serão criadas, e o
   relatório final diz quantas foram, com as datas.
4. **Guarda de sanidade.** Mais de 31 linhas novas de uma vez interrompe e pede
   confirmação explícita — protege contra um `until` errado gerando centenas de
   linhas.
5. **Verificação de formato.** Linha apendada por API pode não herdar o formato
   de data da linha acima. Após gravar, reler a coluna A das linhas novas e
   confirmar que voltaram como serial de data, não como texto. Se voltar texto,
   aplicar o formato explicitamente.

## Zero explícito

Toda data processada grava as dez métricas, usando `0` quando não houve
ocorrência. Nunca deixa célula em branco por ausência de dado.

Aqui essa regra é estrutural, não cosmética: "célula vazia" é o próprio sinal de
"dia pendente" na Fase 1. Um dia processado que gravasse branco voltaria como
pendente em toda execução seguinte, para sempre.

## Formato dos valores

Números crus — a planilha é `pt_BR` e formata sozinha. Inteiros em C, D, E, H, I,
J, M. Float em F, K (reais) e N (fração decimal do bounce). Nada de string com
vírgula decimal.

## Erros e guardas

| Situação | Comportamento |
|---|---|
| Linha parcialmente preenchida | pular, avisar, não sobrescrever (a menos que `$ARGUMENTS` force) |
| Buraco na sequência de datas | reportar e interromper |
| > 31 linhas novas | interromper e pedir confirmação explícita |
| GA4 sem linha para `lp2` no dia | gravar `0` sessões e `0` bounce, e avisar |
| Falha de uma das três fontes | interromper antes de gravar — não grava dia pela metade |

## Testes

`pytest` em `scripts/dados_lp/test_sheet.py`, no padrão de
`scripts/planilha_resultados/test_sheet.py`. Cobertura das funções puras:

- `build_date_row_map` com cabeçalho, linhas vazias no fim, formato `dd/mm/yyyy`
- `check_consecutive` detectando buraco e aprovando sequência íntegra
- `pending_dates` com linha cheia, vazia e parcial; respeitando `until`
- `missing_dates` com zero, uma e várias datas faltando; e com `until` anterior à
  última data (nada a criar)
- `append_rows_payload` conferindo a reancoragem das oito fórmulas
- `cell_updates` conferindo que nenhuma coluna proibida aparece e que chave
  ausente não vira célula

## Entregáveis

| Arquivo | O quê |
|---|---|
| `.claude/skills/dados-lp-caveo.md` | a skill |
| `scripts/dados_lp/sheet.py` | lógica pura + I/O fino |
| `scripts/dados_lp/test_sheet.py` | testes |
| `scripts/dados_lp/conftest.py` | se necessário, no padrão dos vizinhos |
| `docs/projeto-mapa.md` | entrada nova (papel de guardião de organização) |
