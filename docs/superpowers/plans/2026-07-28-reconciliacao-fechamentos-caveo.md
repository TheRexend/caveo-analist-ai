# Reconciliação de Fechamentos MM/RF (Skill vs Dashboard) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estancar a divergência de contagem de fechamentos entre a planilha "Resultados Mês Atual" e o dashboard, e criar uma skill de reconciliação sob demanda para auditar a divergência já existente.

**Architecture:** Duas frentes independentes, reaproveitando `scripts/acompanhamento_diario/` (sem pasta nova). (1) Uma função `classify_contratante` testada em Python, espelhando `config/business-rules.ts`, substitui a classificação "de memória" que a skill diária faz hoje — estanca divergência futura sem mudar nenhum comportamento já validado. (2) Uma skill nova, só leitura, reaproveita essa função mais um helper de leitura da planilha (`read_fechamentos`) para comparar o ledger contra uma query agregada e ao vivo no Salesforce, dia a dia e segmento a segmento, com drill-down de oportunidades nos dias divergentes.

**Tech Stack:** Python 3 do sistema (`gspread` 6.x, `pytest` 8.x — `mcps/.venv` NÃO tem essas libs), Salesforce SOQL (mesmo MCP/REST já usado pela skill diária), Google Sheets via service account, Markdown (skills/commands do projeto).

## Global Constraints

- **Escopo é só fechamento** (coluna O) — não mexe em MQL/SQL/leads/investimento nesta rodada.
- **Planilha "Resultados Mês Atual" continua imutável** — nenhuma task desta plano reescreve dias já gravados nem muda a cadência append-only da `acompanhamento-diario-caveo`.
- **A skill nova é 100% leitura** — nunca grava na planilha nem no Salesforce.
- **Reaproveitar `scripts/acompanhamento_diario/`** — não criar pasta/módulo novo; estender `segments.py` e `sheet.py`.
- **Fuso `-03:00` sempre** para datas de Salesforce (`LastStageChangeDate`), mesma convenção da skill diária.
- **Blocos da aba (dia _d_ → linha):** MM = 45+_d_ (dias 1–31 → 46–76) · RF = 87+_d_ (88–118); coluna O = fechamento.
- **Planilha:** `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`, aba `Resultados Mês Atual`. **Auth:** `.claude/sheets_credentials.json` via `gspread`.
- **Testes:** `cd scripts/acompanhamento_diario && python3 -m pytest -q` (22 testes passam hoje, antes de qualquer mudança).
- **Todo skill do projeto tem um comando espelho em `.claude/commands/<mesmo-nome>.md`** — invólucro fino que só invoca a skill.

---

### Task 1: `classify_contratante` testado em Python

**Files:**
- Modify: `scripts/acompanhamento_diario/segments.py` (append ao final)
- Test: `scripts/acompanhamento_diario/test_segments.py` (append ao final + linha de import)

**Interfaces:**
- Produces: `classify_contratante(tip_cte: str | None, tempo_de_formado: str | None) -> "rf" | "mm" | None`, mais as constantes `RF_SEGMENTS`, `MM_SEGMENTS`, `SPLIT_SEGMENT`, `RF_RECENCY_VALUES` (todas em `segments.py`) — consumidas pela Task 2 (skill diária) e pela Task 4 (skill de reconciliação).

- [ ] **Step 1: Escrever os testes que falham**

Editar `scripts/acompanhamento_diario/test_segments.py`: trocar a linha de import no topo do arquivo

```python
from segments import classify_segment, allocate
```

por

```python
from segments import classify_segment, allocate, classify_contratante
```

e adicionar ao final do arquivo:

```python
def test_classify_contratante_formando_sempre_rf():
    assert classify_contratante("Formando", None) == "rf"
    assert classify_contratante("Formando", "Vai se formar") == "rf"


def test_classify_contratante_medico_dividido_pela_recencia():
    assert classify_contratante("Médico", "Menos de 3 anos") == "rf"
    assert classify_contratante("Médico", "Vai se formar") == "rf"
    assert classify_contratante("Médico", "Mais de 3 anos") == "mm"
    assert classify_contratante("Médico", None) == "mm"  # fallback


def test_classify_contratante_revalida_e_mm():
    assert classify_contratante("Revalida", None) == "mm"


def test_classify_contratante_tipcte_nulo_ou_desconhecido_e_none():
    assert classify_contratante(None, None) is None
    assert classify_contratante("Outro", "Menos de 3 anos") is None
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_segments.py -v`
Expected: `ImportError: cannot import name 'classify_contratante' from 'segments'` (ou `ModuleNotFoundError` equivalente) — a função ainda não existe.

- [ ] **Step 3: Implementar `classify_contratante`**

Adicionar ao final de `scripts/acompanhamento_diario/segments.py`:

```python
# Espelha CONTRATANTE_RULES / classifyContratante
# (fonte de verdade: config/business-rules.ts).
RF_SEGMENTS = ("Formando",)
MM_SEGMENTS = ("Revalida",)
SPLIT_SEGMENT = "Médico"
RF_RECENCY_VALUES = ("Menos de 3 anos", "Vai se formar")


def classify_contratante(tip_cte, tempo_de_formado):
    """'rf', 'mm' ou None a partir de TipCte__c + Tempo_de_Formado__c."""
    if tip_cte in RF_SEGMENTS:
        return "rf"
    if tip_cte in MM_SEGMENTS:
        return "mm"
    if tip_cte == SPLIT_SEGMENT:
        return "rf" if tempo_de_formado in RF_RECENCY_VALUES else "mm"
    return None
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_segments.py -v`
Expected: todos os testes de `test_segments.py` (os antigos + os 4 novos) em `PASSED`.

- [ ] **Step 5: Rodar a suíte inteira (garantir que nada quebrou)**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest -q`
Expected: `26 passed` (22 anteriores + 4 novos).

- [ ] **Step 6: Commit**

```bash
git add scripts/acompanhamento_diario/segments.py scripts/acompanhamento_diario/test_segments.py
git commit -m "$(cat <<'EOF'
feat(acompanhamento-diario): adiciona classify_contratante testado em Python

Espelha CONTRATANTE_RULES/classifyContratante de config/business-rules.ts,
para a classificação RF/MM de fechamentos deixar de depender de memória.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Skill diária usa `classify_contratante` (fecha o gap de documentação)

**Files:**
- Modify: `.claude/skills/acompanhamento-diario-caveo.md`

**Interfaces:**
- Consumes: `classify_contratante` (Task 1, `scripts/acompanhamento_diario/segments.py`).

Não há teste automatizado para um arquivo markdown de instrução — a verificação é por leitura/grep exata do texto final.

- [ ] **Step 1: Atualizar a seção "Fundação" (topo do arquivo)**

Substituir o parágrafo:

```
Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`. MQL/SQL
usam `QUALIFICATION_RULES` (seção 7); alocação de segmento usa `SEGMENT_ALLOCATION`
(seção 8). Segmento por `TipCte__c` + `Tempo_de_Formado__c` via `classifyContratante` (seção 4). NÃO reescrever essas listas aqui.
```

por:

```
Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`. MQL/SQL
usam `QUALIFICATION_RULES` (seção 7); alocação de segmento usa `SEGMENT_ALLOCATION`
(seção 8). Segmento por `TipCte__c` + `Tempo_de_Formado__c` via
`classify_contratante` (seção 4) — **sempre** `from segments import
classify_contratante` (`scripts/acompanhamento_diario/segments.py`); nunca
aplicar a regra de cabeça. NÃO reescrever essas listas aqui.
```

- [ ] **Step 2: Atualizar a Fase 1C (histórico p/ MQL/SQL)**

Substituir:

```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment` por `classifyContratante(TipCte__c, Tempo_de_Formado__c)`.
Opps que classificam como `null` (`TipCte__c` vazio) são **descartadas** — não
entram em `mm`/`rf` (o acumulador só tem essas duas chaves).
```

por:

```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment = classify_contratante(TipCte__c,
Tempo_de_Formado__c)` (`from segments import classify_contratante` — nunca
classificar de memória).
Opps que classificam como `None` (`TipCte__c` vazio) são **descartadas** — não
entram em `mm`/`rf` (o acumulador só tem essas duas chaves).
```

- [ ] **Step 3: Adicionar instrução de classificação à Fase 1D (hoje ausente)**

Substituir:

````
### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, Tempo_de_Formado__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```
> **Atenção fuso:** o Salesforce devolve `LastStageChangeDate` em **UTC**
````

por:

````
### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, Tempo_de_Formado__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```
Esta query **não filtra por `TipCte__c`** — classificar cada linha em
`segment = classify_contratante(TipCte__c, Tempo_de_Formado__c)` (`from
segments import classify_contratante`; nunca de memória). Opps que classificam
como `None` são **descartadas** do `SF_CLOSINGS` — mesma regra de 1C/1E.

> **Atenção fuso:** o Salesforce devolve `LastStageChangeDate` em **UTC**
````

- [ ] **Step 4: Atualizar a Fase 1E (rateio institucional)**

Substituir:

```
Bucketizar em `{ (utmcam, dia): {mm: n, rf: n} }` (segmento via `classifyContratante(TipCte__c, Tempo_de_Formado__c)`; dia em `-03:00`). Opps que
classificam como `null` (`TipCte__c` vazio) são **descartadas** do rateio.
```

por:

```
Bucketizar em `{ (utmcam, dia): {mm: n, rf: n} }` (segmento via
`classify_contratante(TipCte__c, Tempo_de_Formado__c)` — `from segments import
classify_contratante`; dia em `-03:00`). Opps que classificam como `None`
(`TipCte__c` vazio) são **descartadas** do rateio.
```

- [ ] **Step 5: Atualizar o import no script Python da Fase 2**

Substituir:

```python
from segments import allocate, classify_segment
```

por:

```python
from segments import allocate, classify_segment, classify_contratante
```

- [ ] **Step 6: Verificar as mudanças**

Run: `grep -n "classifyContratante" .claude/skills/acompanhamento-diario-caveo.md`
Expected: nenhum resultado (todas as ocorrências viraram `classify_contratante`).

Run: `grep -n "classify_contratante" .claude/skills/acompanhamento-diario-caveo.md`
Expected: 5 ocorrências (Fundação, 1C, 1D ×2 — código e prosa da nova nota, 1E, import da Fase 2) — conferir manualmente que cada uma faz sentido no contexto ao redor.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/acompanhamento-diario-caveo.md
git commit -m "$(cat <<'EOF'
docs(acompanhamento-diario): skill passa a usar classify_contratante testado

Fase 1D não tinha nenhuma instrução de classificação de segmento — corrigido.
1C/1E trocam a referência em prosa por import explícito da função testada
(Task 1), fechando o gap que causava classificação "de memória" a cada run.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `read_fechamentos` em `sheet.py` (leitura simétrica à escrita)

**Files:**
- Modify: `scripts/acompanhamento_diario/sheet.py` (append ao final)
- Test: `scripts/acompanhamento_diario/test_sheet.py` (append ao final)

**Interfaces:**
- Consumes: `BLOCK_BASE` (já existe em `sheet.py`: `{"mm": 45, "rf": 87}`).
- Produces: `read_fechamentos(worksheet) -> {"mm": {1..31: int | None}, "rf": {1..31: int | None}}` — consumida pela Task 4 (skill de reconciliação). `worksheet` é qualquer objeto com `.get(a1_range: str) -> list[list[str]]` (mesma interface gspread já usada por `write_updates`).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `scripts/acompanhamento_diario/test_sheet.py`:

```python
from sheet import read_fechamentos


class _FakeReadWS:
    """Simula gspread: .get(range) devolve linhas; trailing vazio é omitido
    (mesmo comportamento real do gspread .get())."""

    def __init__(self, mm_col=None, rf_col=None):
        self.mm_col = mm_col or []
        self.rf_col = rf_col or []

    def get(self, rng):
        if rng.startswith("O46"):
            return [[v] if v != "" else [] for v in self.mm_col]
        if rng.startswith("O88"):
            return [[v] if v != "" else [] for v in self.rf_col]
        raise ValueError(f"range inesperado: {rng}")


def test_read_fechamentos_valores_presentes():
    ws = _FakeReadWS(mm_col=["2", "1", "0"], rf_col=["1", "3"])
    out = read_fechamentos(ws)
    assert out["mm"][1] == 2
    assert out["mm"][2] == 1
    assert out["mm"][3] == 0  # zero explícito é um valor, não ausência
    assert out["rf"][1] == 1
    assert out["rf"][2] == 3


def test_read_fechamentos_dia_vazio_no_meio_e_none():
    ws = _FakeReadWS(mm_col=["2", "1", "", "0", "3"])
    out = read_fechamentos(ws)
    assert out["mm"][3] is None
    assert out["mm"][4] == 0
    assert out["mm"][5] == 3


def test_read_fechamentos_dias_finais_omitidos_pelo_gspread_sao_none():
    ws = _FakeReadWS(mm_col=["2", "1"])  # dias 3..31 nem aparecem na resposta
    out = read_fechamentos(ws)
    assert out["mm"][3] is None
    assert out["mm"][31] is None


def test_read_fechamentos_cobre_dias_1_a_31_nos_dois_segmentos():
    ws = _FakeReadWS()  # planilha totalmente vazia (mês novo)
    out = read_fechamentos(ws)
    assert set(out.keys()) == {"mm", "rf"}
    assert set(out["mm"].keys()) == set(range(1, 32))
    assert all(v is None for v in out["mm"].values())
    assert all(v is None for v in out["rf"].values())
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_sheet.py -v`
Expected: `ImportError: cannot import name 'read_fechamentos' from 'sheet'`.

- [ ] **Step 3: Implementar `read_fechamentos`**

Adicionar ao final de `scripts/acompanhamento_diario/sheet.py`:

```python
def _parse_fechamento_cell(cell):
    """'' (ausente/vazio) -> None; string numérica -> int (0 é valor real)."""
    if not cell:
        return None
    return int(cell)


def read_fechamentos(worksheet):
    """{'mm': {dia: valor_ou_None}, 'rf': {...}} a partir da coluna O
    (fechamento) dos blocos MM/RF. Espelha cell_updates/write_updates
    (escrita) com uma leitura simétrica."""
    out = {}
    for seg, base in BLOCK_BASE.items():
        first_row, last_row = base + 1, base + 31
        rows = worksheet.get(f"O{first_row}:O{last_row}")
        days = {}
        for day in range(1, 32):
            idx = day - 1
            row = rows[idx] if idx < len(rows) else []
            cell = row[0] if row else ""
            days[day] = _parse_fechamento_cell(cell)
        out[seg] = days
    return out
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_sheet.py -v`
Expected: todos os testes de `test_sheet.py` (os antigos + os 4 novos) em `PASSED`.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest -q`
Expected: `30 passed` (26 da Task 1 + 4 novos).

- [ ] **Step 6: Commit**

```bash
git add scripts/acompanhamento_diario/sheet.py scripts/acompanhamento_diario/test_sheet.py
git commit -m "$(cat <<'EOF'
feat(acompanhamento-diario): adiciona read_fechamentos (leitura da coluna O)

Leitura simétrica à escrita já existente (cell_updates/write_updates), para
a skill de reconciliação comparar o ledger gravado contra o Salesforce atual.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Skill `reconciliacao-fechamentos-caveo`

**Files:**
- Create: `.claude/skills/reconciliacao-fechamentos-caveo.md`

**Interfaces:**
- Consumes: `classify_contratante` (Task 1), `read_fechamentos` (Task 3) — ambos de `scripts/acompanhamento_diario/`.

Skill markdown (instrução de procedimento) — sem teste automatizado; verificação por leitura do arquivo final.

- [ ] **Step 1: Criar o arquivo da skill**

Criar `.claude/skills/reconciliacao-fechamentos-caveo.md` com o conteúdo completo:

````markdown
---
name: reconciliacao-fechamentos-caveo
description: Reconciliação sob demanda entre a planilha "Resultados Mês Atual" (fechamentos MM/RF) e o Salesforce atual — compara dia a dia, aponta divergência e lista oportunidades para conferência manual. Só leitura, nunca grava.
---

# Skill: Reconciliação de Fechamentos — Caveo

Compara os fechamentos (coluna O) gravados na planilha "Resultados Mês Atual"
contra o estado **atual** do Salesforce, dia a dia e segmento a segmento
(MM/RF). Aponta onde a divergência nasceu e lista as oportunidades do dia
sinalizado para conferência manual. **Só leitura — nunca grava na planilha nem
no Salesforce.**

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`, aba `Resultados Mês Atual` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account, leitura) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Mesmo modelo cpc+cruzamento de `docs/fundacao-dados.md` (fuso `-03:00`), mesma
`WON_CLAUSE` (seção 3), mesmo `classify_contratante` (seção 4) — `from segments
import classify_contratante` (`scripts/acompanhamento_diario/segments.py`).
NÃO reescrever essas regras aqui.

## Fase 0 — Período

- Padrão: dia 1 do mês corrente até o último dia com valor **não vazio**
  gravado na coluna O da planilha (ver Fase 1).
- Override: `$ARGUMENTS` pode conter um intervalo explícito (`YYYY-MM-DD a
  YYYY-MM-DD`) para reconciliar uma janela menor **dentro do mês corrente**
  (ex.: só a primeira quinzena). A aba "Resultados Mês Atual" só cobre o mês
  em curso — reconciliar um mês já fechado exigiria apontar para uma aba/
  planilha arquivada, fora do escopo desta skill.
- Informar: `Reconciliando de [START] a [END]…`

## Fase 1 — Ler a planilha

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from sheet import read_fechamentos
import gspread
from google.oauth2.service_account import Credentials

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
ws = gspread.authorize(creds).open_by_key(
    '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')

ledger = read_fechamentos(ws)  # {"mm": {dia: valor_ou_None}, "rf": {...}}

# Último dia gravado = maior dia com valor não-None em qualquer segmento.
last_day = max(
    (d for seg in ("mm", "rf") for d, v in ledger[seg].items() if v is not None),
    default=None,
)
if last_day is None:
    print("Nada gravado ainda neste mês — nada a reconciliar.")
    # não seguir para as fases seguintes.
```

Se `$ARGUMENTS` trouxer um intervalo explícito, usar START/END dali em vez de
dia 1..último dia gravado; caso contrário `END = last_day` (padrão).

## Fase 2 — Consultar o Salesforce agora (uma query agregada)

Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da
fundação) combinados com `OR`:

```sql
SELECT DAY_ONLY(convertTimezone(LastStageChangeDate)) d,
       TipCte__c, Tempo_de_Formado__c, COUNT(Id) cnt
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
GROUP BY DAY_ONLY(convertTimezone(LastStageChangeDate)), TipCte__c, Tempo_de_Formado__c
```

Para cada linha do resultado, `segment = classify_contratante(TipCte__c,
Tempo_de_Formado__c)`; descartar linhas com `segment is None`. Acumular em
`live = {"mm": {dia: n}, "rf": {dia: n}}` (dia = `int(d[8:10])`, mesma
convenção de `day_of` da skill diária). Dias sem nenhuma linha ficam ausentes
de `live[seg]` — tratar como `0` na comparação (Fase 3), **não** como "não
processado" (essa distinção é só do ledger, que tem células vazias de
verdade).

## Fase 3 — Comparar

```python
rows = []  # (dia, segmento, ledger, salesforce_agora, diff)
for day in range(1, last_day + 1):
    for seg in ("mm", "rf"):
        led = ledger[seg].get(day)
        if led is None:
            continue  # dia não processado pela skill diária — fora da comparação
        liv = live[seg].get(day, 0)
        rows.append((day, seg, led, liv, liv - led))

divergentes = [r for r in rows if r[4] != 0]
```

## Fase 4 — Drill-down nos dias divergentes

Para cada `(dia, segmento)` em `divergentes`, uma query pontual (só aquele
dia, sem filtro de `TipCte__c`):

```sql
SELECT Id, Name, Account.Name, StageName, LastStageChangeDate,
       TipCte__c, Tempo_de_Formado__c
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [DIA]T00:00:00-03:00
  AND LastStageChangeDate <= [DIA]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
```

Classificar cada resultado com `classify_contratante` e manter só os que
classificam para o `segmento` sinalizado. Listar (Id, Name, Account, StageName,
LastStageChangeDate) para conferência manual.

> **Isso mostra a verdade atual do Salesforce para aquele dia — não um diff de
> IDs contra o que a planilha gravou** (a planilha nunca guardou IDs, só
> contagem agregada). Serve de apoio à investigação manual, não resolve
> retroativamente sozinho.

## Fase 5 — Relatório final

Imprimir, nesta ordem:

1. Tabela dia × segmento × ledger × Salesforce-agora × diff (todas as linhas
   de `rows`, com as divergentes marcadas).
2. Total do período: soma de `ledger` vs. soma de `live`, por segmento e
   geral.
3. Para cada dia/segmento divergente: a lista de oportunidades da Fase 4.

Nunca gravar nada — nem na planilha, nem em nenhuma outra aba/arquivo.
````

- [ ] **Step 2: Verificar o frontmatter e a estrutura**

Run: `head -5 .claude/skills/reconciliacao-fechamentos-caveo.md`
Expected: bloco `---` com `name: reconciliacao-fechamentos-caveo` e `description: ...` presentes.

Run: `grep -c "^## Fase" .claude/skills/reconciliacao-fechamentos-caveo.md`
Expected: `5` (Fases 1 a 5, além da Fase 0 com `##`).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/reconciliacao-fechamentos-caveo.md
git commit -m "$(cat <<'EOF'
feat(skills): adiciona reconciliacao-fechamentos-caveo

Skill sob demanda, só leitura: compara o ledger da planilha "Resultados Mês
Atual" contra o Salesforce atual, dia a dia e segmento a segmento, com
drill-down de oportunidades nos dias divergentes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Comando `.claude/commands/reconciliacao-fechamentos-caveo.md`

**Files:**
- Create: `.claude/commands/reconciliacao-fechamentos-caveo.md`

**Interfaces:**
- Consumes: skill `reconciliacao-fechamentos-caveo` (Task 4) — invocada por nome.

- [ ] **Step 1: Criar o comando (mesmo padrão de `acompanhamento-diario-caveo.md`)**

Criar `.claude/commands/reconciliacao-fechamentos-caveo.md` com:

```markdown
---
description: Reconciliação sob demanda entre a planilha "Resultados Mês Atual" e o Salesforce atual (fechamentos MM/RF)
argument-hint: [intervalo opcional YYYY-MM-DD a YYYY-MM-DD]
---

Invoque a skill `reconciliacao-fechamentos-caveo` para esta tarefa. Argumentos do usuário (se houver): $ARGUMENTS
```

- [ ] **Step 2: Verificar**

Run: `cat .claude/commands/reconciliacao-fechamentos-caveo.md`
Expected: conteúdo idêntico ao Step 1, 6 linhas.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/reconciliacao-fechamentos-caveo.md
git commit -m "$(cat <<'EOF'
feat(commands): adiciona comando /reconciliacao-fechamentos-caveo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Atualizar o índice `docs/projeto-mapa.md`

**Files:**
- Modify: `docs/projeto-mapa.md`

**Interfaces:** nenhuma (só documentação/índice).

- [ ] **Step 1: Inserir a skill nova na árvore de skills**

Substituir:

```
│   ├── acompanhamento-diario-caveo.md (procedimento; diário MM/RF; grava planilha)
│   └── brainstorming.md            (infra genérica)
```

por:

```
│   ├── acompanhamento-diario-caveo.md (procedimento; diário MM/RF; grava planilha)
│   ├── reconciliacao-fechamentos-caveo.md (procedimento; só leitura; planilha × Salesforce)
│   └── brainstorming.md            (infra genérica)
```

- [ ] **Step 2: Verificar**

Run: `grep -n "reconciliacao-fechamentos-caveo" docs/projeto-mapa.md`
Expected: 1 ocorrência, na árvore de skills.

- [ ] **Step 3: Commit**

```bash
git add docs/projeto-mapa.md
git commit -m "$(cat <<'EOF'
docs(mapa): adiciona reconciliacao-fechamentos-caveo ao índice de skills

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Verificação final (depois da Task 6)

- [ ] Run: `cd scripts/acompanhamento_diario && python3 -m pytest -q` → Expected: `30 passed`.
- [ ] Run: `grep -rn "classifyContratante" .claude/skills/acompanhamento-diario-caveo.md` → Expected: nenhum resultado.
- [ ] Run: `git log --oneline -6` → Expected: os 6 commits desta plano, um por task, na ordem.
