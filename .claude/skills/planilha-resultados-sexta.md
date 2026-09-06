---
name: planilha-resultados-sexta
description: Coleta dados consolidados de Meta Ads, Google Ads, GA4 e Salesforce (MQL/SQL do dia) e grava na aba "Banco de dados - Inside Sales" da planilha "[CAVEO] | Nova Planilha de ROAS e Resultados". Preenche retroativo os dias-do-mês pendentes, sem segmentação por Médico/Formando. Detecta mês anterior incompleto e faz o backfill do mês inteiro antes de limpar (com confirmação) a virada de mês. Use para atualizar o dashboard de ROAS e Resultados.
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
| M (Demais) | `meta_leads` | `actions[lead]` — lead padrão, **não** `complete_registration`/`onsite_web_lead` |
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

### Histórico — comparativo A-1/M-1 (colunas T:V, dentro do bloco meta)

Pra cada dia-do-mês D do mês ATIVO da planilha, U e V trazem o volume de
leads das plataformas (Meta + Google, mesma régua de `meta_leads` +
`google_*_conv` somados — **sem** MQL/SQL/Salesforce) no dia D de um período
de referência no passado. Ver Fase 2E para a coleta.

| Coluna | Chave | Régua |
|---|---|---|
| T | (day, sem chave em `COLS`) | dia-do-mês, idêntico às outras colunas "Day" |
| U | `leads_a1` | `meta_leads(dia D) + Σ google_*_conv(dia D)`, no mês/ano `MES_ATIVO`/`ANO_ATIVO - 1` ("A-1" = um ano atrás) |
| V | `leads_m1` | idem, no mês imediatamente anterior a `MES_ATIVO` ("M-1" = um mês atrás) |

**Dia sem correspondente no mês de referência (ex. linha 31 buscando M-1 num
mês de 30 dias, ou linhas 29-31 buscando A-1 num fevereiro comum): deixar
em branco — não é "zero leads", é "esse dia não existe" naquele período.**
Não é bug essas linhas aparecerem como "parciais" pra sempre nesses meses —
é o esperado (ver Pontos de Atenção).

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

**Única exceção: `leads_a1`/`leads_m1` (colunas U/V do bloco Histórico).**
Dia sem correspondente no mês de referência fica em branco de propósito —
não existiu, não é "zero leads". Ver seção "Histórico" acima.

## Fase 0 — Alvo

Duas datas mandam aqui: `HOJE = date.today()` e `D_MENOS_1 = HOJE -
timedelta(days=1)`.

**A skill não lê nem escreve `Inside Sales!B1`.** Essa aba passou a ter um
bloco de 3 colunas por mês (hoje: B/C/D = Agosto, arquivado; E/F/G =
Setembro), criado manualmente pelo time conforme o mês avança — o rótulo da
primeira coluna fica parado ali como cabeçalho do arquivo histórico, não
indica mais "o mês ativo" (ver "Pontos de Atenção" pra o incidente que
motivou essa mudança, 2026-09-04). Ler `B1` pra detectar virada dá falso
positivo (ele nunca muda) ou falso negativo, dependendo de quando o time
mexeu na aba por último.

Abrir a conexão gspread (só o `Banco de dados`, não precisa mais de
`Inside Sales`):

```python
import gspread
from google.oauth2.service_account import Credentials
import sys
sys.path.insert(0, 'scripts/planilha_resultados_sexta')
from sheet import CLEAR_RANGES

SHEET_ID = '13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok'

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets'])
gc = gspread.authorize(creds)
sh = gc.open_by_key(SHEET_ID)
banco = sh.worksheet('Banco de dados - Inside Sales')
```

**Perguntar sempre ao operador** (decisão explícita do cliente — nunca
inferir sozinho), logo no início de toda execução:

```
Hoje é [HOJE, por extenso]. O "Banco de dados - Inside Sales" já está
processando [nome do mês de HOJE.month]/[HOJE.year] (sem virada pendente)?
Ou ainda está registrando um mês anterior e precisa virar antes?
```

- **Resposta "sim, já está no mês corrente":** `mudou = False`.
  `UNTIL_DAY = D_MENOS_1.day`; o mês processado é `HOJE.year`/`HOJE.month`.
  Informar `Coletando de 01 a [UNTIL_DAY] de [MÊS]...` e seguir direto para
  a Fase 1 — a Fase 0.5 não tem nada a fazer. Se isso cair num
  `HOJE.day == 1` (a virada anterior já tinha sido feita e ninguém coletou
  ainda hoje), `UNTIL_DAY` aponta pro último dia do mês anterior — já
  coletado antes daquela virada —, então não sobra dia-alvo; seguir mesmo
  assim para a Fase 1, que reporta `dias_alvo` vazio e para sozinha.
- **Resposta "não, ainda está em [MES_SAIU]/[ANO_SAIU]":** `mudou = True`
  — usar o mês/ano que o operador informar (perguntar o ano também se não
  for óbvio pelo contexto, ex. virada dezembro→janeiro). Ir direto para a
  Fase 0.1 antes de qualquer outra coisa, **independente do dia do mês**:
  não é só o caso de "hoje é dia 1" — se a coleta ficar alguns dias sem
  rodar depois da virada do calendário, o mês anterior pode ter vários dias
  sem coleta, não só o último.
- **Override de dia único:** `$ARGUMENTS` aceita um dia-do-mês (`1`-`31`) e,
  nesse caso, **força a regravação** daquele dia mesmo já preenchido, sobre
  o layout de linhas do mês ativo do `Banco de dados` (confirmado com o
  operador acima), sem virar mês.
- **Override de mês completo:** `$ARGUMENTS` aceita também `mes-completo`
  (ou `completo`) — roda o backfill da Fase 0.1 sob demanda pro mês ATIVO
  do `Banco de dados`, mesmo com `mudou == False`. Serve pra fechar um mês
  que ficou incompleto sem esperar a virada do calendário acontecer sozinha.

## Fase 0.1 — Mês anterior incompleto (fechar antes de virar)

Todo dia sem coleta do mês que está saindo, se a virada limpar a planilha
antes de gravá-lo, fica permanentemente sem dado — célula limpa não volta.
Esta fase roda sempre que o operador confirmar `mudou == True` (Fase 0),
**antes de qualquer limpeza**, e cobre o mês INTEIRO que saiu, não só o
último dia:

1. `MES_SAIU`/`ANO_SAIU` = o que o operador informou na Fase 0 (não
   inferir de nenhuma célula da planilha). `ULTIMO_DIA =
   calendar.monthrange(ANO_SAIU, MES_SAIU)[1]`.
2. Ler o `Banco de dados` **ainda sem limpar** — as linhas 3-33 e 38-68
   ainda carregam o layout do mês que saiu — e checar `pending_days` e
   `partial_days` dos dois blocos com `until_day=ULTIMO_DIA` (mesmas
   funções da Fase 1, cobrindo 1..`ULTIMO_DIA` inteiro, não só o último
   dia). Usar a conexão gspread já aberta na Fase 0 (`banco`); nada de
   `batch_clear` ainda.
3. Se `pendentes` ou `parciais` vier não-vazio: reportar a lista completa
   (ex. "Agosto incompleto: dias 28-31 pendentes") e perguntar ao operador
   se quer rodar o backfill agora.
   - **Com "sim":** um passe normal de Fases 1-4, com `ANO`/`MES` =
     `ANO_SAIU`/`MES_SAIU` e `dias_alvo = pendentes + parciais` — parciais
     entram aqui porque fechar o mês é decisão explícita do operador, a
     mesma licença do override de dia único (não vale a regra "parcial
     nunca sobrescreve sozinho" da Fase 1 normal).
   - **Com recusa ou pulo:** seguir mesmo assim — não forçar —, mas
     **dizer explicitamente no relatório da Fase 5** quais dias do mês que
     saiu ficaram sem coleta ou parciais.
4. Só depois disso ir para a Fase 0.5 (limpeza da virada). Depois de limpar,
   se `HOJE.day > 1`, seguir na mesma execução para a Fase 1 já mirando o
   mês novo (`UNTIL_DAY = D_MENOS_1.day`); se `HOJE.day == 1`, parar (nada
   do mês novo aconteceu ainda).

**Sob demanda, fora da virada:** `$ARGUMENTS = mes-completo` (ou
`completo`) roda os passos 1-3 pro mês ATIVO do `Banco de dados` (confirmado
com o operador) mesmo com `mudou == False` — fecha um mês incompleto sem
esperar o calendário virar.

## Fase 0.5 — Virada de mês (ação destrutiva, só depois da Fase 0.1)

`mudou`, `MES_SAIU`/`ANO_SAIU` e a conexão gspread (`banco`) já vêm da Fase
0/0.1. Se `mudou == True`, a Fase 0.1 já tratou o mês que está saindo
(backfill completo, com ou sem recusa do operador) antes de chegar aqui —
esta fase nunca limpa a planilha sem passar por ela primeiro.

**Se `mudou` for `True`:** avisar o usuário exatamente assim e PARAR até
confirmação:

```
Confirmado: o Banco de dados ainda está em [MES_SAIU]/[ANO_SAIU], mas hoje
é [mês corrente]. Preciso limpar as linhas 3-33 e 38-68 antes de gravar o
mês novo. Confirma a limpeza? (sim para confirmar)
```

Só após "sim":

```python
banco.batch_clear(list(CLEAR_RANGES.values()))
print('Limpeza feita — Banco de dados pronto para', HOJE.month, '/', HOJE.year)
```

**Não escrever em `Inside Sales!B1` nem em nenhuma célula de `Inside
Sales`** — essa aba não é mais controlada por esta skill (ver Fase 0 e
"Pontos de Atenção"). Avisar o operador, no relatório final, que o time
pode precisar adicionar o bloco de colunas do mês novo em `Inside Sales`
manualmente, se ainda não tiver feito.

**Se `mudou` for `False`:** seguir para a Fase 1, sem tocar em nada.

**Parada obrigatória no dia 1:** se `HOJE.day == 1` — tendo havido virada ou
não —, o mês novo ainda não tem um único dia coletável (D-1 é do mês
anterior, já tratado na Fase 0.1). Reportar e **parar** aqui, sem inventar
`UNTIL_DAY`:

```
Mês virou para [MÊS NOVO], planilha limpa. Nada a coletar ainda hoje — rode
novamente amanhã.
```

Se o operador já respondeu na Fase 0 que não havia virada pendente, mesma
parada, trocando a primeira frase por `Banco de dados já está em [MÊS
NOVO].`

## Fase 1 — Reconhecimento

```python
grid_meta = {r + 3: row for r, row in enumerate(banco.get('A3:V33'))}
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

`grid_meta` agora vai até V (não mais R) porque o bloco `historico` (T:V)
mora nas mesmas linhas do bloco `meta` — ver Fase 1B.

Com `$ARGUMENTS = dia`: `dias_alvo = [dia]` direto, ignorando pendente/parcial
(força regravação). Se `dias_alvo` vier vazio (sem override), avisar e parar.

No backfill de mês completo (Fase 0.1, automático por virada ou via
`$ARGUMENTS = mes-completo`): `UNTIL_DAY = ULTIMO_DIA` do mês sendo fechado
e `dias_alvo = pendentes + parciais` — parciais **entram**, não são
pulados. A exclusão de parciais do bloco acima só vale pro fluxo diário
normal.

## Fase 1B — Reconhecimento do Histórico (A-1/M-1, mês inteiro)

Independente de `dias_alvo` acima — A-1/M-1 são datas passadas que já
aconteceram por completo, então não ficam presas ao `UNTIL_DAY` de hoje.

```python
import calendar

ULTIMO_DIA_ATIVO = calendar.monthrange(ANO, MES)[1]  # ANO/MES do mês sendo processado nesta passada
pendentes_hist = pending_days('historico', grid_meta, ULTIMO_DIA_ATIVO)
parciais_hist = partial_days('historico', grid_meta, ULTIMO_DIA_ATIVO)
dias_alvo_hist = sorted(set(pendentes_hist) | set(parciais_hist))
print('histórico pendente:', pendentes_hist)
print('histórico parcial:', parciais_hist)
```

Se `dias_alvo_hist` vier vazio: bloco já completo pro mês ativo, pular a
Fase 2E inteira (nada a coletar). Parciais aqui **entram** em
`dias_alvo_hist` (mesma lógica do backfill de mês completo) — não faz
sentido pedir confirmação separada pra "sobrescrever" um valor de A-1/M-1,
já que o número certo pra aquele dia é sempre o mesmo, não muda com o
tempo.

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
o `value` da action `lead`→`meta_leads`.
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
from sheet import UTMCAM_TO_GOOGLE_TYPE, google_channel_bucket

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
    if canal == 'google':
        # Fallback pra "search" é decisão do cliente e está certo — mas nunca
        # silencioso: se um slug novo aparecer, o preview tem que mostrar.
        # `None`/vazio é o caso normal de "opp sem UTM" e não vira aviso; o que
        # importa é slug preenchido que ninguém mapeou.
        slugs_fallback = sorted({o['utmcam'].strip() for o in opps.values()
                                 if o['utmcam'] and o['utmcam'].strip()
                                 and o['utmcam'].strip().lower()
                                 not in UTMCAM_TO_GOOGLE_TYPE})
        if slugs_fallback:
            print('Aviso: UtmCam__c sem mapeamento (contando como "search"):',
                  slugs_fallback)
```

**Se qualquer uma das quatro fontes falhar, interromper antes de gravar.**

### 2E. Histórico — A-1/M-1 (só roda se `dias_alvo_hist` da Fase 1B não vier vazio)

Reaproveita Meta e Google — não é uma quinta fonte, é a mesma régua de
`meta_leads`/`google_*_conv` aplicada a datas passadas em vez de hoje.
**Se falhar, também interrompe antes de gravar** — não é aceitável gravar
metade do comparativo (só A-1 sem M-1, por exemplo).

```python
MES_A1, ANO_A1 = MES, ANO - 1
MES_M1, ANO_M1 = (12, ANO - 1) if MES == 1 else (MES - 1, ANO)

ULTIMO_A1 = calendar.monthrange(ANO_A1, MES_A1)[1]
ULTIMO_M1 = calendar.monthrange(ANO_M1, MES_M1)[1]

dias_a1 = [d for d in dias_alvo_hist if d <= ULTIMO_A1]  # dia não existe no mês -> fica de fora, célula em branco
dias_m1 = [d for d in dias_alvo_hist if d <= ULTIMO_M1]
```

**Meta (uma chamada por dia, igual à 2A):** pra cada dia em `dias_a1` e
depois em `dias_m1`, `mcp__meta-ads-mcp__get_insights` com
`time_range={"since": DATA, "until": DATA}` na data correspondente
(`ANO_A1-MES_A1-dia` / `ANO_M1-MES_M1-dia`). Somar o `value` da action
`lead` só das campanhas **fora** de `objetivo_por_campanha[...] ==
"OUTCOME_AWARENESS"` (mesmo filtro da 2A) → `meta_leads_dia`. Reaproveitar
`objetivo_por_campanha` da 2A **só se** ela já cobrir campanhas antigas o
bastante — campanha de 2025 pode não aparecer num fetch de 200 campanhas
recentes; se um `campaign_id` do insight não estiver no mapa, tratar como
"Demais Campanhas" (não Awareness) por padrão, e avisar no relatório.

**Google (uma chamada por janela, igual à 2B):** uma
`mcp__google-ads-mcp__search_search` cobrindo `MIN(dias_a1)`-`MAX(dias_a1)`
no ano/mês `ANO_A1`/`MES_A1`, e outra cobrindo `MIN(dias_m1)`-`MAX(dias_m1)`
em `ANO_M1`/`MES_M1` — mesmos fields da 2B. Somar `metrics.conversions` de
TODOS os `advertising_channel_type` juntos por dia (sem separar
Search/PMax/DGen aqui — o comparativo é um número só) →
`google_conv_dia`.

**Combinar por dia:** `leads_a1[dia] = meta_leads_dia(A-1) +
google_conv_dia(A-1)` pra `dia` em `dias_a1`; idem `leads_m1[dia]` com as
séries M-1 e `dias_m1`. Dia fora de `dias_a1`/`dias_m1` (mês de referência
mais curto) não entra no dict — vira `None` em `cell_updates`, que já pula
chave `None` sozinho (fica em branco, não grava `0`).

## Fase 3 — Cálculo e preview

Combinar 2A-2D em `METRICAS = {dia: {chave de COLS: valor}}` pros dias de
`dias_alvo`, garantindo as 31 chaves de sempre presentes (zero explícito,
exceto `leads_a1`/`leads_m1` — ver Fase 2E). Se a Fase 2E rodou, mesclar
`leads_a1`/`leads_m1` no `METRICAS[dia]` correspondente — o conjunto de
dias vira `sorted(set(dias_alvo) | set(dias_alvo_hist))`, porque um dia
pode estar só em `dias_alvo_hist` (ex. dia 20 do mês ativo ainda não
aconteceu, mas o comparativo A-1/M-1 daquele dia-do-mês já existe). Imprimir
a tabela dia × métricas e as células A1 exatas que serão gravadas
(`cell_updates`/`day_label_updates`). Então perguntar:

```
Gravar estes dias na aba "Banco de dados - Inside Sales"? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

```python
from sheet import cell_updates, day_label_updates, write_updates

updates = []
for dia, metrics in sorted(METRICAS.items()):
    updates.extend(day_label_updates(dia))
    updates.extend(cell_updates(dia, metrics))
total = write_updates(banco, updates, value_input_option='RAW')
print(f'Gravadas {total} células.')
```

## Fase 5 — Relatório

Dizer se houve virada de mês (e o que foi limpo), quantas células foram
gravadas, e listar os dias parciais que foram pulados. Se a Fase 0.1 rodou,
dizer quais dias do mês que saiu ficaram sem coleta ou parciais (ou que o
mês foi fechado por completo). Se a Fase 2E rodou, dizer quantos dias do
Histórico foram preenchidos e quais dias ficaram em branco de propósito
(fora do alcance do mês de referência A-1 ou M-1).

## Pontos de Atenção

- **A regra de D-1 só vale com a planilha em dia.** Se a coleta ficar
  parada por vários dias depois de uma virada de calendário, `mudou`
  continua `True` até alguém rodar a skill — e nesse meio-tempo o mês que
  saiu pode acumular vários dias sem coleta, não só o último. É pra isso
  que existe a Fase 0.1 (automática) e o override `mes-completo` (sob
  demanda): nunca confirmar a limpeza da Fase 0.5 sem antes checar o mês
  INTEIRO que está saindo.
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
- **`Inside Sales` não indica mais o mês ativo (incidente 2026-09-04).** A
  aba passou a ter um bloco de 3 colunas por mês (B/C/D, E/F/G, ...),
  adicionado manualmente pelo time — o rótulo da primeira coluna (`B1`)
  fica parado como cabeçalho do arquivo histórico. A skill escreveu
  "SETEMBRO" em `B1` na virada de 2026-09-03 e o time reverteu pra "AGOSTO"
  ao criar o bloco novo (comportamento correto do lado deles, given a nova
  estrutura) — o que quebraria a detecção automática de virada se ela ainda
  lesse essa célula. Por isso a Fase 0 agora **pergunta sempre ao operador**
  em vez de inferir de qualquer célula de `Inside Sales`, e a Fase 0.5
  nunca mais escreve lá. `month_changed`/`MESES_PT`/`month_name` em
  `sheet.py` ficaram órfãos dessa mudança — ainda existem e têm teste, mas
  nenhuma fase desta skill os chama mais.
- **Fuso:** Salesforce devolve datas em UTC; sempre converter pra `-03:00`
  antes de extrair o dia (`dia_br`).
- **`dia_do_mes_se_no_periodo` é obrigatório** no cruzamento de Salesforce —
  sem ele, uma transição de um mês anterior com o mesmo dia-do-mês seria
  contada na linha errada.
- **Histórico (T:V) não tem MQL/SQL, só leads de plataforma.** É Meta
  `actions[lead]` (Demais Campanhas) + Google `conversions`, igual às
  colunas M/E-M-U — nunca puxar Salesforce aqui, e nunca incluir Awareness.
- **Linhas 29-31 do Histórico ficam "parciais" pra sempre em meses cujo A-1
  ou M-1 é mais curto** (ex. mês ativo de 31 dias com M-1 de 30, ou A-1
  caindo num fevereiro comum). Não é bug e não precisa de force/override —
  U ou V daquele dia sempre vai ficar em branco porque a data de referência
  não existe, e `partial_days` vai continuar reportando isso a cada
  execução. Só a Fase 2E decide se roda (baseada em `dias_alvo_hist`), não
  precisa de confirmação manual pra essas linhas.
- **`CLEAR_RANGES["meta"]` agora cobre até V (não só R)** — se alguém
  reverter isso pra `A3:R33` sem querer, a virada de mês para de limpar o
  Histórico e o mês novo herda A-1/M-1 do mês anterior, errado.
