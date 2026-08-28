---
name: planilha-resultados-sexta
description: Coleta dados consolidados de Meta Ads, Google Ads, GA4 e Salesforce (MQL/SQL do dia) e grava na aba "Banco de dados - Inside Sales" da planilha "[CAVEO] | Nova Planilha de ROAS e Resultados". Preenche retroativo os dias-do-mês pendentes, sem segmentação por Médico/Formando. Detecta e limpa (com confirmação) a virada de mês. Use para atualizar o dashboard de ROAS e Resultados.
---

# Skill: Planilha de Resultados (Sexta) — Caveo

Coleta por **dia-do-mês × canal** e grava na aba `Banco de dados - Inside
Sales`. Substitui a skill `planilha-resultados` (aposentada). **Sem
segmentação Médico/Formando** — todo número é o total de mídia paga
atribuída ao canal.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| GA4 | property `488647966` |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok` |
| Aba de escrita | `Banco de dados - Inside Sales` |
| Aba de leitura (mês ativo) | `Inside Sales`, célula `B1` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`) |
| Helper | `scripts/planilha_resultados_sexta/sheet.py` |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00` —
os fragmentos completos estão na Fase 2D. MQL/SQL usam `QUALIFICATION_RULES`
(fundação seção 7) via `from qualification import mql_day, sql_day`
(`scripts/acompanhamento_diario/qualification.py`) — **nunca reimplementar**.
**Sem `classify_contratante`/`allocate`** — esta skill não segmenta.

## Réguas de métrica (NÃO alterar de cabeça)

### Meta Ads — split por `objective`

`OUTCOME_AWARENESS` → bloco Awareness; qualquer outro objective → bloco
Demais Campanhas.

| Coluna | Chave | Régua |
|---|---|---|
| B (Awareness) | `meta_aw_invest` | `spend` |
| C (Awareness) | `meta_aw_alcance` | `reach` |
| D (Awareness) | `meta_aw_impressoes` | `impressions` |
| E (Awareness) | `meta_aw_seguidores` | sem métrica de Ads Insights — **gravar sempre 0** (ver "Pontos de Atenção") |
| H (Demais) | `meta_invest` | `spend` |
| I (Demais) | `meta_alcance` | `reach` |
| J (Demais) | `meta_impressoes` | `impressions` |
| K (Demais) | `meta_cliques` | `actions[link_click]` |
| L (Demais) | `meta_lpv` | `actions[landing_page_view]` |
| M (Demais) | `meta_leads` | `actions[complete_registration]` (fallback `offsite_conversion.fb_pixel_complete_registration`) — "Registro Concluído", **não** `lead`/`onsite_web_lead` |
| N (Demais) | `meta_mql` | Salesforce — dia da 1ª transição que cruza o gate MQL, opps atribuídas a Meta |
| O (Demais) | `meta_sql` | Salesforce — idem, gate SQL |

### Google Ads — split por `campaign.advertising_channel_type`

`SEARCH` → Search; `PERFORMANCE_MAX` → PMax; `DEMAND_GEN` → DGen. Hoje a
conta só tem Search e PMax ativas — o bloco DGen fica zerado até existir uma
campanha desse tipo.

| Coluna | Chave (Search / PMax / DGen) | Régua |
|---|---|---|
| B / J / R | `*_invest` | `metrics.cost_micros / 1_000_000` |
| C / K / S | `*_impressoes` | `metrics.impressions` |
| D / L / T | `*_cliques` | `metrics.clicks` |
| E / M / U | `*_conv` | `metrics.conversions` (arredondar no fim — faz o papel de "Leads") |
| F / N / V | `*_mql` | Salesforce — dia da 1ª transição que cruza o gate MQL, bucket pelo tipo de campanha (ver Fase 2D) |
| G / O / W | `*_sql` | Salesforce — idem, gate SQL |

### GA4

| Coluna | Chave | Régua |
|---|---|---|
| R (bloco meta) | `ga4_sessoes` | `sessions` do property `488647966`, total do site (sem filtro de página) |

## Colunas fora do alcance da skill

TikTok Ads (linhas 74-104) e Pinterest Ads (linhas 109-139): a aba `Inside
Sales` já tem fórmulas apontando pra lá, mas nem o cabeçalho existe no
`Banco de dados` — a Caveo não anuncia nesses canais hoje. **Nunca criar
nem escrever nesses blocos.** "Vendas"/"Receita"/"Ticket Médio" e a coluna
"Meta" (metas) da aba `Inside Sales`: preenchimento manual do time
comercial/cliente — **nunca tocar**.

## Zero explícito (regra de ouro)

Todo dia dentro do período processado grava as métricas com `0` quando não
houve ocorrência. Célula nunca fica em branco por falta de dado — "célula
vazia" é o sinal de "dia pendente" na Fase 1.

## Fase 0 — Alvo

- **Padrão:** `UNTIL_DAY = dia-do-mês de D-1` (ou o último dia do mês
  corrente, se D-1 já for mês passado). Calcular com `calendar.monthrange`.
- **Override:** `$ARGUMENTS` aceita um dia-do-mês (`1`-`31`) e, nesse caso,
  **força a regravação** daquele dia mesmo já preenchido.
- Informar: `Coletando de 01 a [UNTIL_DAY] de [MÊS]...`

## Fase 0.5 — Virada de mês (checar toda execução, ação destrutiva)

```python
import gspread
from google.oauth2.service_account import Credentials
import sys
sys.path.insert(0, 'scripts/planilha_resultados_sexta')
from sheet import CLEAR_RANGES, month_changed

SHEET_ID = '13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok'

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets'])
gc = gspread.authorize(creds)
sh = gc.open_by_key(SHEET_ID)
inside_sales = sh.worksheet('Inside Sales')
banco = sh.worksheet('Banco de dados - Inside Sales')

active_label = inside_sales.acell('B1').value or ''
mudou = month_changed(active_label, HOJE.month)  # HOJE = date.today()
print('rótulo atual:', active_label, '| mês corrente:', HOJE.month, '| mudou:', mudou)
```

**Se `mudou` for `True`:** avisar o usuário exatamente assim e PARAR até
confirmação:

```
A planilha ainda está no mês [rótulo atual], mas hoje é [mês corrente]. Preciso
limpar as linhas 3-33 e 38-68 do "Banco de dados" antes de gravar o mês novo.
Confirma a limpeza? (sim para confirmar)
```

Só após "sim":

```python
for rng in CLEAR_RANGES.values():
    banco.batch_clear([rng])
inside_sales.update_acell('B1', month_name(HOJE.month))
print('Limpeza feita, mês atualizado para', month_name(HOJE.month))
```

**Se `mudou` for `False`:** seguir direto para a Fase 1, sem tocar em nada.

## Fase 1 — Reconhecimento

```python
grid_meta = {r + 3: row for r, row in enumerate(banco.get('A3:R33'))}
grid_google = {r + 38: row for r, row in enumerate(banco.get('A38:W68'))}

from sheet import partial_days, pending_days

pendentes = sorted(set(pending_days('meta', grid_meta, UNTIL_DAY))
                   | set(pending_days('google', grid_google, UNTIL_DAY)))
parciais = sorted(set(partial_days('meta', grid_meta, UNTIL_DAY))
                  | set(partial_days('google', grid_google, UNTIL_DAY)))
dias_alvo = [d for d in pendentes if d not in parciais]
print('pendentes:', pendentes)
print('parciais (serão pulados):', parciais)
print('dias-alvo:', dias_alvo)
```

Com `$ARGUMENTS = dia`: `dias_alvo = [dia]` direto, ignorando pendente/parcial
(força regravação). Se `dias_alvo` vier vazio (sem override), avisar e parar.

## Fase 2 — Coleta (para cada dia de `dias_alvo`, `MIN_DIA`/`MAX_DIA` = extremos)

### 2A. Meta — objetivo das campanhas (uma chamada) + insights (uma chamada POR DIA)

`mcp__meta-ads-mcp__get_campaigns` com `account_id="act_438086148409254"`,
`status_filter=""`, `limit=200` → construir `objetivo_por_campanha = {id:
objective}`.

Para cada dia em `dias_alvo`: `mcp__meta-ads-mcp__get_insights` com
`object_id="act_438086148409254"`, `level="campaign"`,
`time_range={"since": DIA, "until": DIA}`, `limit=100` (uma chamada por dia —
o MCP ignora `time_increment` e agrega o range inteiro).

Por linha (campanha) do dia: olhar `objetivo_por_campanha[campaign_id]`. Se
`"OUTCOME_AWARENESS"`: somar `spend`→`meta_aw_invest`, `reach`→`meta_aw_alcance`,
`impressions`→`meta_aw_impressoes`. Caso contrário: somar `spend`→`meta_invest`,
`reach`→`meta_alcance`, `impressions`→`meta_impressoes`, o `value` da action
`link_click`→`meta_cliques`, o `value` da action `landing_page_view`→`meta_lpv`,
o `value` da action `complete_registration` (fallback
`offsite_conversion.fb_pixel_complete_registration`)→`meta_leads`.
`meta_aw_seguidores` = sempre `0` (ver Pontos de Atenção).

### 2B. Google — uma chamada cobre `MIN_DIA`-`MAX_DIA`

`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields `["campaign.id",
"campaign.advertising_channel_type", "segments.date", "metrics.cost_micros",
"metrics.impressions", "metrics.clicks", "metrics.conversions"]`, conditions
`["segments.date BETWEEN '[MIN_DIA]' AND '[MAX_DIA]'"]`.

Por linha: bucket = `"search"` se `advertising_channel_type == "SEARCH"`,
`"pmax"` se `"PERFORMANCE_MAX"`, `"dgen"` se `"DEMAND_GEN"` — qualquer outro
valor é inesperado hoje; **avisar e não gravar** essa linha, não adivinhar.
Agrupar por `(segments.date, bucket)` e somar: `cost_micros`/1e6 →
`google_{bucket}_invest`, `impressions` → `google_{bucket}_impressoes`,
`clicks` → `google_{bucket}_cliques`, `conversions` (arredondar só no fim) →
`google_{bucket}_conv`.

### 2C. GA4 — uma chamada cobre `MIN_DIA`-`MAX_DIA`

`mcp__ga4__ga4_run_report` com `metrics=["sessions"]`, `dimensions=["date"]`,
`date_start`/`date_end` no intervalo, `limit=500`. A dimensão `date` volta
como `YYYYMMDD` — converter pra dia-do-mês antes de casar com `dias_alvo`.

### 2D. Salesforce — MQL/SQL por dia × canal (rodar num script Python, não pelo MCP tool)

```python
import json, io, os, sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

os.environ.update(json.load(io.open('.mcp.json'))
                  ['mcpServers']['salesforce-mcp']['env'])
sys.path.insert(0, '.claude')
sys.path.insert(0, 'scripts/acompanhamento_diario')
sys.path.insert(0, 'scripts/planilha_resultados_sexta')
import salesforce_mcp_server as sf
from qualification import mql_day, sql_day
from sheet import google_channel_bucket

BR = timezone(timedelta(hours=-3))
YEAR_MONTH = f'{ANO:04d}-{MES:02d}'  # ANO/MES = mês corrente sendo processado

def dia_br(ts):
    """'2026-08-18T00:02:43.000+0000' -> '2026-08-17' (dia em -03:00)."""
    return datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S.%f%z').astimezone(BR).date().isoformat()

def dia_do_mes_se_no_periodo(iso_date):
    """ISO date -> dia-do-mês, só se cair no mês corrente sendo processado.
    Sem esse filtro, uma transição de julho com dia-do-mês 5 seria confundida
    com o dia 5 de agosto — os dois meses reciclam os mesmos números de linha."""
    if iso_date is not None and iso_date.startswith(YEAR_MONTH):
        return int(iso_date[8:10])
    return None

# Fragmentos cpc + cruzamento da fundação, OR-combinados e prefixados com
# "Opportunity." (obrigatório em OpportunityHistory).
HIST_FRAG = {
    'meta': ("((Opportunity.UtmMed__c LIKE '%cpc%' AND (NOT Opportunity.UtmSou__c LIKE '%google%')) "
             "OR ((Opportunity.UtmMed__c = null OR (NOT Opportunity.UtmMed__c LIKE '%cpc%')) "
             "AND (Opportunity.fbc__c != null OR Opportunity.fbclid__c != null)))"),
    'google': ("((Opportunity.UtmMed__c LIKE '%cpc%' AND Opportunity.UtmSou__c LIKE '%google%') "
               "OR ((Opportunity.UtmMed__c = null OR (NOT Opportunity.UtmMed__c LIKE '%cpc%')) "
               "AND (Opportunity.gclid__c != null OR Opportunity.gbraid__c != null) "
               "AND Opportunity.fbc__c = null AND Opportunity.fbclid__c = null))"),
}

# acc[dia] = {"meta_mql": 0, "meta_sql": 0, "google_search_mql": 0, ...} —
# zero explícito pré-carregado pra todo dia em dias_alvo antes de acumular.
acc = {d: {k: 0 for k in (
    'meta_mql', 'meta_sql', 'google_search_mql', 'google_search_sql',
    'google_pmax_mql', 'google_pmax_sql', 'google_dgen_mql', 'google_dgen_sql')}
    for d in dias_alvo}

LOOKBACK = f'{ANO - 1:04d}-{MES:02d}-01'  # 12 meses antes do início do mês

for canal in ('meta', 'google'):
    res = sf.sf_query_all(
        "SELECT OpportunityId, StageName, CreatedDate, "
        "Opportunity.IsWon, Opportunity.UtmCam__c "
        "FROM OpportunityHistory "
        f"WHERE Opportunity.CreatedDate >= {LOOKBACK}T00:00:00-03:00 "
        f"AND Opportunity.CreatedDate <= {MAX_DIA_ISO}T23:59:59-03:00 "
        f"AND {HIST_FRAG[canal]} ORDER BY OpportunityId, CreatedDate",
        max_records=50000)
    opps = defaultdict(lambda: {'history': [], 'is_won': False, 'utmcam': None})
    for r in res['records']:
        o = opps[r['OpportunityId']]
        o['history'].append({'stage': r['StageName'], 'date': dia_br(r['CreatedDate'])})
        o['is_won'] = (bool((r.get('Opportunity') or {}).get('IsWon'))
                       or r['StageName'] == 'Ganho não Identificado' or o['is_won'])
        if o['utmcam'] is None:
            o['utmcam'] = (r.get('Opportunity') or {}).get('UtmCam__c')
    for o in opps.values():
        prefixo = canal if canal == 'meta' else f"google_{google_channel_bucket(o['utmcam'])}"
        d_mql = dia_do_mes_se_no_periodo(mql_day(o['history'], o['is_won']))
        d_sql = dia_do_mes_se_no_periodo(sql_day(o['history'], o['is_won']))
        if d_mql in acc: acc[d_mql][f'{prefixo}_mql'] += 1
        if d_sql in acc: acc[d_sql][f'{prefixo}_sql'] += 1
```

**Se qualquer uma das quatro fontes falhar, interromper antes de gravar.**

## Fase 3 — Cálculo e preview

Combinar 2A-2D em `METRICAS = {dia: {chave de COLS: valor}}`, garantindo as
30 chaves sempre presentes (zero explícito). Imprimir a tabela dia × 30
métricas e as células A1 exatas que serão gravadas
(`cell_updates`/`day_label_updates`). Então perguntar:

```
Gravar estes dias na aba "Banco de dados - Inside Sales"? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

```python
from sheet import cell_updates, day_label_updates, write_updates

total = 0
for dia, metrics in sorted(METRICAS.items()):
    total += write_updates(banco, day_label_updates(dia), value_input_option='RAW')
    total += write_updates(banco, cell_updates(dia, metrics), value_input_option='RAW')
print(f'Gravadas {total} células.')
```

## Fase 5 — Relatório

Dizer se houve virada de mês (e o que foi limpo), quantas células foram
gravadas, e listar os dias parciais que foram pulados.

## Pontos de Atenção

- **"Seguidores" (Awareness) não tem métrica de Ads Insights nativa** — é
  dado de Page Insights, API diferente. Gravar sempre `0` até existir uma
  campanha `OUTCOME_AWARENESS` ativa que permita validar a fonte certa.
- **Sem segmentação.** Não importar `classify_contratante`/`allocate` — toda
  oportunidade que bate com `[FILTRO_META]`/`[FILTRO_GOOGLE]` conta, mesmo
  Revalida ou `TipCte__c` vazio.
- **`UTMCAM_TO_GOOGLE_TYPE` cobre só as 5 campanhas ativas hoje** — revisar
  se a conta Google Ads mudar de estrutura (mesmo problema que já quebrou o
  alias da antiga `planilha-resultados`).
- **Virada de mês é destrutiva** — nunca limpar `Banco de dados` sem
  confirmação explícita.
- **Fuso:** Salesforce devolve datas em UTC; sempre converter pra `-03:00`
  antes de extrair o dia (`dia_br`).
- **`dia_do_mes_se_no_periodo` é obrigatório** no cruzamento de Salesforce —
  sem ele, uma transição de um mês anterior com o mesmo dia-do-mês seria
  contada na linha errada.
