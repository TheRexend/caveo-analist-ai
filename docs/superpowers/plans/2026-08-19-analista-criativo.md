# Analista de Criativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o ciclo semanal de análise de criativo de Meta Ads — agente `analista-criativo` (3 camadas DOE), skill `criativos-semanal` (fases 0–5) e os helpers Python que calculam o framework de teste e geram o deck `.pptx` de 4 blocos.

**Architecture:** Coleta pelos MCPs (Meta + Salesforce via handoff), cálculo determinístico em módulos Python **puros** (`framework.py`, `coorte.py`, `matriz.py`) com pytest, I/O isolado em três módulos (`meta_video.py` para a Graph API, `registro.py` para o JSONL, `gerar_deck.py` para o PowerPoint), e julgamento no agente. O registro append-only em `data/criativos_registro.jsonl` fecha o loop semana a semana.

**Tech Stack:** Python 3.9 do sistema (`/Library/Developer/CommandLineTools/usr/bin/python3`) · pytest 8.4.2 · python-pptx 1.0.2 · requests 2.32.5 · Markdown para agente/skill/comando.

**Spec:** `docs/superpowers/specs/2026-08-19-analista-criativo-design.md`

## Global Constraints

- **Python é o do sistema**, não o de `mcps/.venv` — o venv **não** tem `python-pptx`. Todo comando de teste é `python3 -m pytest scripts/criativos_semanal -q`.
- **Módulos puros não fazem I/O.** `framework.py`, `coorte.py` e `matriz.py` recebem listas de dicionários e devolvem dados. Sem `open()`, sem `requests`, sem `os.environ`. Essa fronteira é o critério de revisão de cada task.
- **Piso de volume: `MIN_IMPRESSOES = 500`.** Nenhum criativo abaixo disso recebe veredito que não seja `inconclusivo`.
- **Janela criativa: 14 dias** (`TODAY-14` a `TODAY-1`), dividida em coorte `madura` (D-14→D-8) e `recente` (D-7→D-1).
- **Benchmarks** (faixas lidas como piso — acima da faixa é 🟢):

  | KPI | 🔴 | 🟡 | 🟢 |
  |---|---|---|---|
  | `hook_rate` = views 3s ÷ impressões | < 0.20 | 0.20–0.30 | > 0.30 |
  | `hold_rate_hook` = p75 ÷ views 3s | < 0.10 | 0.10–0.15 | > 0.15 |
  | `ctr_link` = link_click ÷ impressões | < 0.015 | 0.015–0.025 | > 0.025 |
  | `cpa` = spend ÷ registros | **> 150.0** | 140.0–150.0 | **< 140.0** |

  CPA é **invertido**: valor alto é ruim. Os outros três, valor alto é bom.
- **Cascata:** `gancho` → `retencao` → `interesse` → `conversao`. O primeiro 🔴 define a causa; 🟡 **não** interrompe.
- **Atribuição por criativo usa só cpc direto** (sem o ramo de cruzamento da fundação). Chave = `UtmCon__c`.
- **Sem filtro de campanha** — todas as campanhas da conta são de conversão.
- **Conta Meta:** `act_438086148409254`. **Token:** `.mcp.json` → `mcpServers.meta-ads-mcp.env.META_ACCESS_TOKEN`.
- **Identidade visual do deck:** verde `#0E8A5F`, fundo `#E8F4EF`, escuro `#1A1A1A`, cinza `#555555`, cinza-bg `#F4F4F4`, cinza-linha `#D9D9D9`, vermelho `#B03A2B`, branco `#FFFFFF`, fonte Calibri, 13.333×7.5 in.
- **Commits:** escopo `criativos-semanal`, seguindo `feat(dados-lp): ...` do repositório.
- **Idioma:** código, testes e documentos em português do Brasil, como o resto do projeto.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `scripts/criativos_semanal/conftest.py` | permite `from framework import ...` nos testes do diretório |
| `scripts/criativos_semanal/framework.py` | **PURO** — KPIs, status 🔴🟡🟢, cascata, veredito |
| `scripts/criativos_semanal/coorte.py` | **PURO** — agrupa anúncios por data de entrada |
| `scripts/criativos_semanal/matriz.py` | **PURO** — células PDA usadas/livres, hooks por ângulo |
| `scripts/criativos_semanal/registro.py` | I/O — lê e acrescenta no JSONL |
| `scripts/criativos_semanal/meta_video.py` | I/O — token do `.mcp.json` + Graph API de vídeo |
| `scripts/deck_caveo.py` | primitivas visuais compartilhadas (cores, `txt`, `rect`, `header`, `footer`, `table`) |
| `scripts/criativos_semanal/gerar_deck.py` | I/O — monta os 5 slides e salva o `.pptx` |
| `scripts/criativos_semanal/test_*.py` | pytest dos três módulos puros + `registro` + `meta_video` |
| `.claude/agents/analista-criativo.md` | agente, camadas D / O / E |
| `.claude/skills/criativos-semanal.md` | procedimento, fases 0–5 |
| `.claude/commands/criativos-semanal.md` | invólucro fino do comando de chat |
| `data/criativos_registro.jsonl` | registro append-only (criado na 1ª execução) |

**Decisão sobre `scripts/deck_caveo.py`:** as primitivas visuais são extraídas para um módulo compartilhado novo, consumido por `gerar_deck.py`. O `scripts/gerar_slides_hot_topics.py` **não é refatorado** nesta entrega — é um deliverable de 2026-08-07 já entregue ao cliente, e mexer nele adiciona risco sem benefício. Ele mantém a própria cópia das primitivas até que alguém precise editá-lo de novo.

---

### Task 1: Pacote e KPIs do framework

**Files:**
- Create: `scripts/criativos_semanal/conftest.py`
- Create: `scripts/criativos_semanal/framework.py`
- Test: `scripts/criativos_semanal/test_framework.py`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: `MIN_IMPRESSOES: int`, `kpis(anuncio: dict) -> dict` com as chaves `hook_rate`, `hold_rate_hook`, `hold_rate_impr`, `ctr_link`, `cpa` (cada uma `float | None`)

O dicionário de anúncio de entrada tem estas chaves, todas numéricas: `impressoes`, `views_3s`, `p75`, `link_clicks`, `spend`, `registros`. Anúncio estático chega com `views_3s = 0` e `p75 = 0`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/criativos_semanal/conftest.py`:

```python
# Permite `from framework import ...` nos testes deste diretório.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
```

Criar `scripts/criativos_semanal/test_framework.py`:

```python
from framework import MIN_IMPRESSOES, kpis


def _anuncio(**kw):
    base = {"impressoes": 1000, "views_3s": 250, "p75": 30,
            "link_clicks": 20, "spend": 300.0, "registros": 2}
    base.update(kw)
    return base


def test_piso_de_volume_e_500_impressoes():
    assert MIN_IMPRESSOES == 500


def test_kpis_do_caso_completo():
    k = kpis(_anuncio())
    assert k["hook_rate"] == 0.25            # 250 / 1000
    assert k["hold_rate_hook"] == 0.12       # 30 / 250
    assert k["hold_rate_impr"] == 0.03       # 30 / 1000
    assert k["ctr_link"] == 0.02             # 20 / 1000
    assert k["cpa"] == 150.0                 # 300 / 2


def test_anuncio_estatico_nao_tem_hook_nem_hold():
    # Estático não gera view de vídeo: os dois primeiros níveis não existem.
    k = kpis(_anuncio(views_3s=0, p75=0))
    assert k["hook_rate"] == 0.0
    assert k["hold_rate_hook"] is None       # denominador zero, não é "0%"
    assert k["hold_rate_impr"] == 0.0
    assert k["ctr_link"] == 0.02


def test_sem_registro_o_cpa_e_indefinido_nao_zero():
    # Dividir por zero registro não pode virar CPA 0 (que seria 🟢).
    k = kpis(_anuncio(registros=0))
    assert k["cpa"] is None


def test_sem_impressao_todos_os_kpis_por_impressao_sao_indefinidos():
    k = kpis(_anuncio(impressoes=0, views_3s=0, p75=0, link_clicks=0))
    assert k["hook_rate"] is None
    assert k["ctr_link"] is None
    assert k["hold_rate_impr"] is None
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'framework'`

- [ ] **Step 3: Implementação mínima**

Criar `scripts/criativos_semanal/framework.py`:

```python
"""Framework de teste de criativo do Meta Ads — cálculo e classificação.

Módulo PURO: recebe dicionários, devolve dicionários. Sem rede, sem arquivo.
Espelha os benchmarks acordados com o cliente (ver o spec
docs/superpowers/specs/2026-08-19-analista-criativo-design.md, §4.1).
"""

# Nenhum criativo abaixo disso recebe veredito diferente de "inconclusivo":
# hook rate e CTR sobre poucas centenas de impressões são ruído, não leitura.
MIN_IMPRESSOES = 500


def _div(numerador, denominador):
    """Divisão que devolve None quando o denominador é zero.

    None significa "indefinido", e é diferente de 0.0. Um CPA de 0 seria lido
    como excelente; um CPA indefinido (nenhum registro) não pode ser julgado.
    """
    if not denominador:
        return None
    return numerador / denominador


def kpis(anuncio):
    """Os quatro KPIs do framework, mais o hold rate no segundo denominador."""
    impressoes = anuncio["impressoes"]
    views_3s = anuncio["views_3s"]
    return {
        "hook_rate": _div(views_3s, impressoes),
        "hold_rate_hook": _div(anuncio["p75"], views_3s),
        "hold_rate_impr": _div(anuncio["p75"], impressoes),
        "ctr_link": _div(anuncio["link_clicks"], impressoes),
        "cpa": _div(anuncio["spend"], anuncio["registros"]),
    }
```

- [ ] **Step 4: Rodar os testes**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 5 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/criativos_semanal/conftest.py scripts/criativos_semanal/framework.py scripts/criativos_semanal/test_framework.py
git commit -m "feat(criativos-semanal): KPIs do framework de teste de criativo"
```

---

### Task 2: Status, cascata e veredito

**Files:**
- Modify: `scripts/criativos_semanal/framework.py`
- Test: `scripts/criativos_semanal/test_framework.py`

**Interfaces:**
- Consumes: `kpis()` e `MIN_IMPRESSOES` da Task 1
- Produces:
  - `BENCHMARKS: dict`
  - `status(kpi: str, valor: float | None) -> str` → `"verde"` | `"amarelo"` | `"vermelho"` | `"na"`
  - `nivel_quebrado(sts: dict) -> str | None` → `"gancho"` | `"retencao"` | `"interesse"` | `"conversao"` | `None`
  - `avaliar(anuncio: dict, hooks_no_angulo: int = 0) -> dict` — devolve o anúncio acrescido de `hook_rate`, `hold_rate_hook`, `hold_rate_impr`, `ctr_link`, `cpa`, `status` (dict), `nivel_quebrado`, `veredito`

Vereditos: `escalar` · `iterar` · `matar` · `inconclusivo` · `fora_criativo`.

Os nomes dos níveis da cascata são `gancho`/`retencao`/`interesse`/`conversao` — deliberadamente **não** "atencao", para não colidir com o status `"amarelo"` (que o slide do cliente chama de atenção).

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `scripts/criativos_semanal/test_framework.py`:

```python
from framework import avaliar, nivel_quebrado, status


def test_status_usa_faixa_como_piso_acima_da_faixa_e_verde():
    assert status("hook_rate", 0.35) == "verde"
    assert status("hook_rate", 0.25) == "amarelo"
    assert status("hook_rate", 0.19) == "vermelho"


def test_status_do_cpa_e_invertido():
    # CPA alto é ruim: a escala anda ao contrário dos outros três KPIs.
    assert status("cpa", 120.0) == "verde"
    assert status("cpa", 145.0) == "amarelo"
    assert status("cpa", 180.0) == "vermelho"


def test_status_indefinido_e_na():
    assert status("hold_rate_hook", None) == "na"


def test_cascata_para_no_primeiro_vermelho():
    sts = {"hook_rate": "vermelho", "hold_rate_hook": "vermelho",
           "ctr_link": "vermelho", "cpa": "vermelho"}
    assert nivel_quebrado(sts) == "gancho"


def test_amarelo_nao_quebra_a_cascata():
    # Amarelo é atenção, não causa. A cascata segue para o próximo nível.
    sts = {"hook_rate": "amarelo", "hold_rate_hook": "amarelo",
           "ctr_link": "vermelho", "cpa": "verde"}
    assert nivel_quebrado(sts) == "interesse"


def test_na_nao_quebra_a_cascata():
    # Estático: gancho e retenção são N/A, o julgamento começa no interesse.
    sts = {"hook_rate": "na", "hold_rate_hook": "na",
           "ctr_link": "verde", "cpa": "vermelho"}
    assert nivel_quebrado(sts) == "conversao"


def test_tudo_verde_nao_quebra_nivel_nenhum():
    sts = {"hook_rate": "verde", "hold_rate_hook": "verde",
           "ctr_link": "verde", "cpa": "verde"}
    assert nivel_quebrado(sts) is None


def test_abaixo_do_piso_e_inconclusivo_mesmo_com_kpi_otimo():
    a = avaliar(_anuncio(impressoes=400, views_3s=200, p75=60,
                         link_clicks=20, spend=100.0, registros=2))
    assert a["veredito"] == "inconclusivo"


def test_tudo_verde_e_escalar():
    a = avaliar(_anuncio(impressoes=1000, views_3s=400, p75=80,
                         link_clicks=30, spend=200.0, registros=2))
    assert a["nivel_quebrado"] is None
    assert a["veredito"] == "escalar"


def test_tudo_verde_com_cpa_vermelho_sai_do_escopo_de_criativo():
    a = avaliar(_anuncio(impressoes=1000, views_3s=400, p75=80,
                         link_clicks=30, spend=400.0, registros=2))
    assert a["nivel_quebrado"] == "conversao"
    assert a["veredito"] == "fora_criativo"


def test_hook_vermelho_com_menos_de_dois_hooks_no_angulo_e_iterar():
    a = avaliar(_anuncio(impressoes=1000, views_3s=100), hooks_no_angulo=1)
    assert a["nivel_quebrado"] == "gancho"
    assert a["veredito"] == "iterar"


def test_hook_vermelho_com_dois_hooks_no_angulo_mata_o_angulo():
    # A cadência manda testar 2-3 aberturas antes de descartar o conceito.
    a = avaliar(_anuncio(impressoes=1000, views_3s=100), hooks_no_angulo=2)
    assert a["veredito"] == "matar"


def test_ctr_vermelho_nao_mata_angulo_mesmo_com_muitos_hooks():
    # Só o gancho reprovado condena o ângulo; CTR ruim é problema de promessa.
    a = avaliar(_anuncio(impressoes=1000, views_3s=400, p75=80,
                         link_clicks=5, spend=200.0, registros=2),
                hooks_no_angulo=3)
    assert a["nivel_quebrado"] == "interesse"
    assert a["veredito"] == "iterar"


def test_amarelo_em_tudo_e_iterar_nao_escalar():
    a = avaliar(_anuncio(impressoes=1000, views_3s=250, p75=30,
                         link_clicks=20, spend=290.0, registros=2))
    assert a["nivel_quebrado"] is None
    assert a["veredito"] == "iterar"
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: FAIL com `ImportError: cannot import name 'avaliar' from 'framework'`

- [ ] **Step 3: Implementar**

Acrescentar a `scripts/criativos_semanal/framework.py`:

```python
# Faixas acordadas com o cliente, lidas como PISO: acima da faixa é 🟢, não
# "fora do padrão". `invertido=True` marca o KPI em que valor alto é ruim.
BENCHMARKS = {
    "hook_rate": {"critico": 0.20, "atencao": 0.30, "invertido": False},
    "hold_rate_hook": {"critico": 0.10, "atencao": 0.15, "invertido": False},
    "ctr_link": {"critico": 0.015, "atencao": 0.025, "invertido": False},
    "cpa": {"critico": 150.0, "atencao": 140.0, "invertido": True},
}

# Ordem da cascata: KPI → nome do nível. O primeiro vermelho define a causa.
CASCATA = (
    ("hook_rate", "gancho"),
    ("hold_rate_hook", "retencao"),
    ("ctr_link", "interesse"),
    ("cpa", "conversao"),
)


def status(kpi, valor):
    """Classifica um KPI contra o benchmark. None vira "na" (indefinido)."""
    if valor is None:
        return "na"
    b = BENCHMARKS[kpi]
    if b["invertido"]:
        if valor > b["critico"]:
            return "vermelho"
        return "amarelo" if valor >= b["atencao"] else "verde"
    if valor < b["critico"]:
        return "vermelho"
    return "amarelo" if valor <= b["atencao"] else "verde"


def nivel_quebrado(sts):
    """Primeiro nível vermelho da cascata. Amarelo e "na" não interrompem."""
    for kpi, nivel in CASCATA:
        if sts.get(kpi) == "vermelho":
            return nivel
    return None


def _veredito(anuncio, sts, nivel, hooks_no_angulo):
    if anuncio["impressoes"] < MIN_IMPRESSOES:
        return "inconclusivo"
    if nivel is None:
        # Nada vermelho: só escala se não houver amarelo pendurado.
        tem_amarelo = any(v == "amarelo" for v in sts.values())
        return "iterar" if tem_amarelo else "escalar"
    if nivel == "conversao":
        # Criativo entrega os três primeiros níveis e a conversão não vem:
        # o problema está na LP ou na medição, não na peça.
        return "fora_criativo"
    if nivel == "gancho" and hooks_no_angulo >= 2:
        # Cadência: 2-3 aberturas de 3s antes de descartar o conceito.
        return "matar"
    return "iterar"


def avaliar(anuncio, hooks_no_angulo=0):
    """Anúncio enriquecido com KPIs, status, nível quebrado e veredito.

    `hooks_no_angulo` é quantas aberturas diferentes já foram testadas no mesmo
    ângulo, vindo do registro histórico (ver matriz.hooks_por_angulo).
    """
    k = kpis(anuncio)
    sts = {kpi: status(kpi, k[kpi]) for kpi, _ in CASCATA}
    nivel = nivel_quebrado(sts)
    saida = dict(anuncio)
    saida.update(k)
    saida["status"] = sts
    saida["nivel_quebrado"] = nivel
    saida["veredito"] = _veredito(anuncio, sts, nivel, hooks_no_angulo)
    return saida
```

- [ ] **Step 4: Rodar os testes**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 19 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/criativos_semanal/framework.py scripts/criativos_semanal/test_framework.py
git commit -m "feat(criativos-semanal): cascata diagnóstica e veredito por criativo"
```

---

### Task 3: Coortes de entrada

**Files:**
- Create: `scripts/criativos_semanal/coorte.py`
- Test: `scripts/criativos_semanal/test_coorte.py`

**Interfaces:**
- Consumes: nada
- Produces:
  - `janela(ref: date) -> tuple[date, date]` → (`ref - 14 dias`, `ref - 1 dia`)
  - `coorte_de(created_time: str, ref: date) -> str` → `"madura"` | `"recente"` | `"fora"`
  - `agrupar(anuncios: list[dict], ref: date) -> dict[str, list[dict]]` com as chaves `"madura"`, `"recente"` e `"fora"`

`created_time` chega da API do Meta no formato `"2026-08-12T20:37:59-0300"`. Só a parte da data importa.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/criativos_semanal/test_coorte.py`:

```python
from datetime import date

from coorte import agrupar, coorte_de, janela

REF = date(2026, 8, 19)   # "hoje" fixo nos testes


def test_janela_cobre_14_dias_terminando_ontem():
    inicio, fim = janela(REF)
    assert inicio == date(2026, 8, 5)
    assert fim == date(2026, 8, 18)
    assert (fim - inicio).days == 13   # 14 dias inclusivos


def test_coorte_madura_e_a_primeira_metade():
    # D-14 a D-8: já passou a fase de aprendizado de 5-7 dias.
    assert coorte_de("2026-08-05T10:00:00-0300", REF) == "madura"
    assert coorte_de("2026-08-11T23:59:00-0300", REF) == "madura"


def test_coorte_recente_e_a_segunda_metade():
    assert coorte_de("2026-08-12T20:37:59-0300", REF) == "recente"
    assert coorte_de("2026-08-18T08:00:00-0300", REF) == "recente"


def test_criativo_de_hoje_esta_fora_da_janela():
    # A janela termina ontem: o dia corrente ainda está incompleto.
    assert coorte_de("2026-08-19T09:00:00-0300", REF) == "fora"


def test_criativo_velho_esta_fora_da_janela():
    assert coorte_de("2026-07-30T09:00:00-0300", REF) == "fora"


def test_agrupar_separa_as_tres_faixas():
    anuncios = [
        {"ad_id": "1", "created_time": "2026-08-06T10:00:00-0300"},
        {"ad_id": "2", "created_time": "2026-08-13T10:00:00-0300"},
        {"ad_id": "3", "created_time": "2026-06-01T10:00:00-0300"},
    ]
    g = agrupar(anuncios, REF)
    assert [a["ad_id"] for a in g["madura"]] == ["1"]
    assert [a["ad_id"] for a in g["recente"]] == ["2"]
    assert [a["ad_id"] for a in g["fora"]] == ["3"]


def test_agrupar_sem_anuncios_devolve_as_tres_chaves_vazias():
    g = agrupar([], REF)
    assert g == {"madura": [], "recente": [], "fora": []}
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `python3 -m pytest scripts/criativos_semanal/test_coorte.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'coorte'`

- [ ] **Step 3: Implementar**

Criar `scripts/criativos_semanal/coorte.py`:

```python
"""Coortes de entrada de criativo, por data de inclusão do anúncio.

Módulo PURO. A janela de 14 dias cobre duas coortes: a "madura" (D-14 a D-8),
que já passou a fase de aprendizado de 5-7 dias e portanto sustenta destaque,
e a "recente" (D-7 a D-1), que é leitura preliminar.
"""
from datetime import date, timedelta

DIAS_JANELA = 14
DIAS_COORTE = 7


def janela(ref):
    """(início, fim) da janela criativa. Termina ontem: hoje é dia incompleto."""
    fim = ref - timedelta(days=1)
    inicio = ref - timedelta(days=DIAS_JANELA)
    return inicio, fim


def _data_de(created_time):
    """A parte de data de "2026-08-12T20:37:59-0300"."""
    return date.fromisoformat(created_time[:10])


def coorte_de(created_time, ref):
    inicio, fim = janela(ref)
    d = _data_de(created_time)
    if d < inicio or d > fim:
        return "fora"
    return "madura" if d < inicio + timedelta(days=DIAS_COORTE) else "recente"


def agrupar(anuncios, ref):
    grupos = {"madura": [], "recente": [], "fora": []}
    for a in anuncios:
        grupos[coorte_de(a["created_time"], ref)].append(a)
    return grupos
```

- [ ] **Step 4: Rodar os testes**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 26 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/criativos_semanal/coorte.py scripts/criativos_semanal/test_coorte.py
git commit -m "feat(criativos-semanal): coortes de entrada na janela de 14 dias"
```

---

### Task 4: Matriz PDA e memória de ângulos

**Files:**
- Create: `scripts/criativos_semanal/matriz.py`
- Test: `scripts/criativos_semanal/test_matriz.py`

**Interfaces:**
- Consumes: nada (recebe o registro já carregado — quem lê o arquivo é a Task 5)
- Produces:
  - `PERSONAS: tuple`, `DESIRES: tuple`, `AWARENESS: tuple`
  - `celulas_usadas(registro: list[dict]) -> set[tuple[str, str, str]]`
  - `celulas_livres(registro: list[dict]) -> list[tuple[str, str, str]]`
  - `hooks_por_angulo(registro: list[dict]) -> dict[str, int]`
  - `angulos_mortos(registro: list[dict]) -> set[str]`

Cada linha do registro tem, entre outras chaves: `persona`, `desire`, `awareness`, `angulo`, `hook`, `nivel_quebrado`, `veredito`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/criativos_semanal/test_matriz.py`:

```python
from matriz import (AWARENESS, DESIRES, PERSONAS, angulos_mortos,
                    celulas_livres, celulas_usadas, hooks_por_angulo)


def _linha(**kw):
    base = {"persona": "Rafael", "desire": "D3", "awareness": "problema",
            "angulo": "plantão como moeda", "hook": "h1",
            "nivel_quebrado": None, "veredito": "escalar"}
    base.update(kw)
    return base


def test_os_tres_eixos_vem_das_fontes_da_caveo():
    assert PERSONAS == ("Larissa", "Diego", "Rafael", "Camila")
    assert DESIRES == ("D1", "D2", "D3", "D4", "D5", "D6", "D7")
    assert AWARENESS == ("inconsciente", "problema", "solucao",
                         "produto", "total")


def test_celulas_usadas_ignora_repeticao():
    r = [_linha(hook="h1"), _linha(hook="h2")]
    assert celulas_usadas(r) == {("Rafael", "D3", "problema")}


def test_matriz_completa_tem_140_celulas():
    assert len(celulas_livres([])) == 4 * 7 * 5


def test_celula_testada_sai_das_livres():
    livres = celulas_livres([_linha()])
    assert ("Rafael", "D3", "problema") not in livres
    assert len(livres) == 139


def test_hooks_por_angulo_conta_hooks_distintos():
    r = [_linha(hook="h1"), _linha(hook="h2"), _linha(hook="h1")]
    assert hooks_por_angulo(r) == {"plantão como moeda": 2}


def test_angulo_com_dois_hooks_reprovados_no_gancho_esta_morto():
    r = [_linha(hook="h1", nivel_quebrado="gancho", veredito="iterar"),
         _linha(hook="h2", nivel_quebrado="gancho", veredito="matar")]
    assert angulos_mortos(r) == {"plantão como moeda"}


def test_angulo_com_um_hook_bom_nao_esta_morto():
    # Basta uma abertura passar no gancho para o ângulo seguir vivo.
    r = [_linha(hook="h1", nivel_quebrado="gancho"),
         _linha(hook="h2", nivel_quebrado="interesse")]
    assert angulos_mortos(r) == set()


def test_angulo_com_um_hook_so_nao_esta_morto():
    r = [_linha(hook="h1", nivel_quebrado="gancho")]
    assert angulos_mortos(r) == set()


def test_registro_vazio_nao_tem_angulo_morto_nem_celula_usada():
    assert angulos_mortos([]) == set()
    assert celulas_usadas([]) == set()
    assert hooks_por_angulo([]) == {}
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `python3 -m pytest scripts/criativos_semanal/test_matriz.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'matriz'`

- [ ] **Step 3: Implementar**

Criar `scripts/criativos_semanal/matriz.py`:

```python
"""Matriz PDA — Persona × Desire × Awareness — e memória de ângulos.

Módulo PURO: recebe o registro já carregado (quem lê o arquivo é registro.py).

Nota de procedência: o P.D.A. original da Pilothouse Digital é
Persona · Desire · *Angle*. O framework com Awareness no terceiro eixo é o Hi5.
Adotamos o rótulo PDA com os eixos abaixo por ser o termo em uso interno.

Eixos ancorados na documentação existente:
  Persona   → docs/personas_medico.md
  Desire    → docs/Dores_Desejos_Publicos_Caveo.md (mapas D1-D7)
  Awareness → 5 níveis de Eugene Schwartz (Breakthrough Advertising, 1966)
"""
from itertools import product

PERSONAS = ("Larissa", "Diego", "Rafael", "Camila")
DESIRES = ("D1", "D2", "D3", "D4", "D5", "D6", "D7")
AWARENESS = ("inconsciente", "problema", "solucao", "produto", "total")

# Quantas aberturas de 3s a cadência manda testar antes de descartar o conceito.
HOOKS_ANTES_DE_DESCARTAR = 2


def celulas_usadas(registro):
    return {(l["persona"], l["desire"], l["awareness"]) for l in registro}


def celulas_livres(registro):
    """As células da matriz que ainda não foram testadas."""
    usadas = celulas_usadas(registro)
    return [c for c in product(PERSONAS, DESIRES, AWARENESS) if c not in usadas]


def hooks_por_angulo(registro):
    """Quantas aberturas DISTINTAS já foram testadas em cada ângulo."""
    por_angulo = {}
    for l in registro:
        por_angulo.setdefault(l["angulo"], set()).add(l["hook"])
    return {angulo: len(hooks) for angulo, hooks in por_angulo.items()}


def angulos_mortos(registro):
    """Ângulos com 2+ aberturas testadas e TODAS reprovadas no gancho.

    Se alguma abertura passou do gancho, o ângulo segue vivo — o problema
    estava na abertura, não no conceito.
    """
    hooks = hooks_por_angulo(registro)
    mortos = set()
    for angulo, n in hooks.items():
        if n < HOOKS_ANTES_DE_DESCARTAR:
            continue
        linhas = [l for l in registro if l["angulo"] == angulo]
        if all(l["nivel_quebrado"] == "gancho" for l in linhas):
            mortos.add(angulo)
    return mortos
```

- [ ] **Step 4: Rodar os testes**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 35 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/criativos_semanal/matriz.py scripts/criativos_semanal/test_matriz.py
git commit -m "feat(criativos-semanal): matriz PDA e memória de ângulos testados"
```

---

### Task 5: Registro JSONL

**Files:**
- Create: `scripts/criativos_semanal/registro.py`
- Test: `scripts/criativos_semanal/test_registro.py`

**Interfaces:**
- Consumes: nada
- Produces:
  - `CAMINHO_PADRAO: str` = `"data/criativos_registro.jsonl"`
  - `ler(caminho) -> list[dict]` — `[]` se o arquivo não existir
  - `acrescentar(caminho, linhas: list[dict]) -> int` — devolve quantas linhas gravou; cria diretório e arquivo se preciso

Este módulo faz I/O e por isso é testado com `tmp_path` do pytest, nunca contra `data/` de verdade.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/criativos_semanal/test_registro.py`:

```python
import json

from registro import CAMINHO_PADRAO, acrescentar, ler


def test_caminho_padrao_e_o_do_spec():
    assert CAMINHO_PADRAO == "data/criativos_registro.jsonl"


def test_ler_arquivo_inexistente_devolve_lista_vazia(tmp_path):
    # Primeira execução: o registro ainda não existe e isso não é erro.
    assert ler(tmp_path / "nao_existe.jsonl") == []


def test_acrescentar_cria_o_arquivo_e_o_diretorio(tmp_path):
    alvo = tmp_path / "sub" / "reg.jsonl"
    assert acrescentar(alvo, [{"ad_id": "1"}]) == 1
    assert alvo.exists()


def test_ida_e_volta_preserva_os_dados(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    linhas = [{"ad_id": "1", "hook_rate": 0.24}, {"ad_id": "2", "hook_rate": None}]
    acrescentar(alvo, linhas)
    assert ler(alvo) == linhas


def test_acrescentar_e_append_only(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    acrescentar(alvo, [{"ad_id": "1"}])
    acrescentar(alvo, [{"ad_id": "2"}])
    assert [l["ad_id"] for l in ler(alvo)] == ["1", "2"]


def test_acrescentar_lista_vazia_nao_escreve_nada(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    assert acrescentar(alvo, []) == 0
    assert not alvo.exists()


def test_acentuacao_e_gravada_legivel(tmp_path):
    # O registro é lido por humanos no terminal: nada de \\u00e2ngulo.
    alvo = tmp_path / "reg.jsonl"
    acrescentar(alvo, [{"angulo": "plantão como moeda"}])
    assert "plantão" in alvo.read_text(encoding="utf-8")


def test_linha_em_branco_no_arquivo_e_ignorada(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    alvo.write_text(json.dumps({"ad_id": "1"}) + "\n\n", encoding="utf-8")
    assert ler(alvo) == [{"ad_id": "1"}]
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `python3 -m pytest scripts/criativos_semanal/test_registro.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'registro'`

- [ ] **Step 3: Implementar**

Criar `scripts/criativos_semanal/registro.py`:

```python
"""Leitura e escrita do registro histórico de criativos testados.

Módulo de I/O. Formato JSONL append-only: uma linha JSON por criativo testado.
Escolhido em vez de tabela Markdown porque matriz.py consome o registro
programaticamente e parsear Markdown em Python é frágil.
"""
import json
from pathlib import Path

CAMINHO_PADRAO = "data/criativos_registro.jsonl"


def ler(caminho):
    """Todas as linhas do registro. Lista vazia se o arquivo não existir."""
    p = Path(caminho)
    if not p.exists():
        return []
    linhas = []
    for bruta in p.read_text(encoding="utf-8").splitlines():
        if bruta.strip():
            linhas.append(json.loads(bruta))
    return linhas


def acrescentar(caminho, linhas):
    """Acrescenta linhas ao fim do registro. Devolve quantas gravou."""
    if not linhas:
        return 0
    p = Path(caminho)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        for linha in linhas:
            # ensure_ascii=False: o registro é lido por humanos no terminal.
            f.write(json.dumps(linha, ensure_ascii=False) + "\n")
    return len(linhas)
```

- [ ] **Step 4: Rodar os testes**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 43 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/criativos_semanal/registro.py scripts/criativos_semanal/test_registro.py
git commit -m "feat(criativos-semanal): registro append-only em JSONL"
```

---

### Task 6: Métricas de vídeo pela Graph API

**Files:**
- Create: `scripts/criativos_semanal/meta_video.py`
- Test: `scripts/criativos_semanal/test_meta_video.py`

**Interfaces:**
- Consumes: nada
- Produces:
  - `CONTA: str` = `"act_438086148409254"`
  - `token(caminho_mcp="~.mcp.json~") -> str` — levanta `RuntimeError` com mensagem clara se não achar
  - `extrair(lista, tipo) -> int` — soma o `value` das entradas cujo `action_type` bate
  - `normalizar(linha: dict) -> dict` — converte a linha crua da Graph API no dicionário que `framework.avaliar` consome
  - `insights_video(since, until, tok, conta=CONTA) -> list[dict]` — a chamada HTTP

**Por que este módulo existe:** o MCP do Meta tem lista de campos fixa (`impressions, clicks, spend, cpc, cpm, ctr, reach, frequency, actions, action_values, conversions, unique_clicks, cost_per_action_type`) e **não** expõe `video_p*_watched_actions` nem `video_thruplay_watched_actions`. Sem eles não há hold rate.

`token()` e `extrair()`/`normalizar()` são testáveis sem rede. `insights_video()` é a única função com HTTP e **não** é testada — é uma casca fina sobre `requests.get`.

**`normalizar()` não devolve `created_time`.** O endpoint `/insights` não traz data de criação do anúncio; ela vem de `get_ads` (coleta 1B da skill). Quem casa as duas fontes por `ad_id` é a Fase 2 da skill, não este módulo. `coorte.agrupar()` exige `created_time`, então essa junção é obrigatória antes de agrupar.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/criativos_semanal/test_meta_video.py`:

```python
import json

import pytest
from meta_video import CONTA, extrair, normalizar, token


def test_conta_e_a_da_caveo():
    assert CONTA == "act_438086148409254"


def test_token_sai_do_mcp_json(tmp_path):
    p = tmp_path / ".mcp.json"
    p.write_text(json.dumps({"mcpServers": {"meta-ads-mcp": {
        "env": {"META_ACCESS_TOKEN": "EAAtoken123"}}}}), encoding="utf-8")
    assert token(p) == "EAAtoken123"


def test_token_ausente_falha_alto_com_mensagem_util(tmp_path):
    # Falhar cedo e claro: um deck sem retenção não pode sair em silêncio.
    p = tmp_path / ".mcp.json"
    p.write_text(json.dumps({"mcpServers": {}}), encoding="utf-8")
    with pytest.raises(RuntimeError, match="META_ACCESS_TOKEN"):
        token(p)


def test_arquivo_mcp_inexistente_falha_alto(tmp_path):
    with pytest.raises(RuntimeError, match="mcp.json"):
        token(tmp_path / "nao_existe.json")


def test_extrair_soma_o_tipo_pedido():
    acoes = [{"action_type": "video_view", "value": "465"},
             {"action_type": "link_click", "value": "26"}]
    assert extrair(acoes, "video_view") == 465
    assert extrair(acoes, "link_click") == 26


def test_extrair_tipo_ausente_e_zero():
    assert extrair([{"action_type": "post_engagement", "value": "5"}],
                   "video_view") == 0


def test_extrair_lista_ausente_e_zero():
    assert extrair(None, "video_view") == 0


def test_normalizar_monta_o_dicionario_que_o_framework_consome():
    linha = {
        "ad_id": "120246069173850088", "ad_name": "CAV082611SV1",
        "adset_id": "120246069043410088", "campaign_name": "[BOO] [LEADS] X",
        "impressions": "1663", "spend": "175.67",
        "actions": [{"action_type": "video_view", "value": "465"},
                    {"action_type": "link_click", "value": "26"},
                    {"action_type": "complete_registration", "value": "1"}],
        "video_p75_watched_actions": [{"action_type": "video_view", "value": "70"}],
    }
    n = normalizar(linha)
    assert n["ad_id"] == "120246069173850088"
    assert n["ad_name"] == "CAV082611SV1"
    assert n["impressoes"] == 1663
    assert n["views_3s"] == 465
    assert n["p75"] == 70
    assert n["link_clicks"] == 26
    assert n["registros"] == 1
    assert n["spend"] == 175.67


def test_normalizar_anuncio_estatico_zera_os_campos_de_video():
    # Sem chave de vídeo na resposta: estático, não erro.
    linha = {"ad_id": "1", "ad_name": "EST", "adset_id": "2",
             "campaign_name": "C", "impressions": "900", "spend": "50.0",
             "actions": [{"action_type": "link_click", "value": "18"}]}
    n = normalizar(linha)
    assert n["views_3s"] == 0
    assert n["p75"] == 0
    assert n["link_clicks"] == 18
    assert n["registros"] == 0
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `python3 -m pytest scripts/criativos_semanal/test_meta_video.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'meta_video'`

- [ ] **Step 3: Implementar**

Criar `scripts/criativos_semanal/meta_video.py`:

```python
"""Métricas de vídeo do Meta Ads pela Graph API.

Módulo de I/O. Existe porque o MCP do Meta tem lista de campos FIXA e não
expõe video_p*_watched_actions nem video_thruplay_watched_actions — sem eles
não há hold rate. Todo o resto (impressões, cliques, spend, actions) o MCP dá.

Credencial: lida de .mcp.json, o mesmo caminho de scripts/push_env_to_vercel.sh.
Nenhuma credencial nova.
"""
import json
from pathlib import Path

import requests

CONTA = "act_438086148409254"
API = "https://graph.facebook.com/v25.0"

CAMPOS = ",".join([
    "ad_id", "ad_name", "adset_id", "adset_name", "campaign_name",
    "impressions", "spend", "actions",
    "video_play_actions", "video_thruplay_watched_actions",
    "video_p25_watched_actions", "video_p50_watched_actions",
    "video_p75_watched_actions", "video_p100_watched_actions",
])


def token(caminho_mcp=".mcp.json"):
    """O META_ACCESS_TOKEN do .mcp.json. Falha alto se não existir."""
    p = Path(caminho_mcp)
    if not p.exists():
        raise RuntimeError(
            f"Não achei {p} para ler o token do Meta. "
            "A skill não pode gerar o deck sem as métricas de retenção.")
    dados = json.loads(p.read_text(encoding="utf-8"))
    tok = (dados.get("mcpServers", {}).get("meta-ads-mcp", {})
           .get("env", {}).get("META_ACCESS_TOKEN"))
    if not tok:
        raise RuntimeError(
            "META_ACCESS_TOKEN ausente em mcpServers.meta-ads-mcp.env "
            f"de {p}. A skill não pode gerar o deck sem retenção.")
    return tok


def extrair(lista, tipo):
    """Soma o `value` das entradas de `actions` cujo action_type bate."""
    if not lista:
        return 0
    return sum(int(float(e["value"])) for e in lista
               if e.get("action_type") == tipo)


def normalizar(linha):
    """Linha crua da Graph API → dicionário que framework.avaliar consome."""
    acoes = linha.get("actions")
    return {
        "ad_id": linha["ad_id"],
        "ad_name": linha["ad_name"],
        "adset_id": linha["adset_id"],
        "campaign_name": linha["campaign_name"],
        "impressoes": int(linha.get("impressions", 0)),
        # video_view no Meta É a view de 3 segundos.
        "views_3s": extrair(acoes, "video_view"),
        "p75": extrair(linha.get("video_p75_watched_actions"), "video_view"),
        "link_clicks": extrair(acoes, "link_click"),
        "registros": extrair(acoes, "complete_registration"),
        "spend": float(linha.get("spend", 0.0)),
    }


def insights_video(since, until, tok, conta=CONTA):
    """Insights nível anúncio COM os campos de vídeo. Casca fina sobre HTTP."""
    linhas, url = [], f"{API}/{conta}/insights"
    params = {
        "level": "ad", "fields": CAMPOS, "limit": 200, "access_token": tok,
        "time_range": json.dumps({"since": since, "until": until}),
    }
    while url:
        r = requests.get(url, params=params, timeout=60)
        r.raise_for_status()
        corpo = r.json()
        linhas.extend(corpo.get("data", []))
        url = corpo.get("paging", {}).get("next")
        params = None   # o `next` já vem com querystring completa
    return [normalizar(l) for l in linhas]
```

- [ ] **Step 4: Rodar os testes**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 52 testes

- [ ] **Step 5: Verificar contra a API de verdade**

Run:
```bash
python3 -c "
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
from meta_video import insights_video, token
linhas = insights_video('2026-08-05', '2026-08-18', token())
print(f'{len(linhas)} anúncios')
com_video = [l for l in linhas if l['views_3s'] > 0]
print(f'{len(com_video)} com vídeo')
if com_video:
    l = max(com_video, key=lambda x: x['impressoes'])
    print(l['ad_name'], 'impr', l['impressoes'], 'views3s', l['views_3s'], 'p75', l['p75'])
"
```
Expected: lista de anúncios com `p75 > 0` em pelo menos um. **Se `p75` vier 0 em todos os anúncios de vídeo, pare e reporte** — significa que o campo não está disponível para esta conta e a decisão 3 do spec precisa ser revista.

- [ ] **Step 6: Commit**

```bash
git add scripts/criativos_semanal/meta_video.py scripts/criativos_semanal/test_meta_video.py
git commit -m "feat(criativos-semanal): métricas de vídeo via Graph API"
```

---

### Task 7: Primitivas visuais do deck

**Files:**
- Create: `scripts/deck_caveo.py`

**Interfaces:**
- Consumes: nada
- Produces: `VERDE`, `VERDE_BG`, `ESCURO`, `CINZA`, `CINZA_BG`, `CINZA_LINHA`, `VERMELHO`, `BRANCO`, `AMARELO`, `FONTE`, `SLIDE_W`, `SLIDE_H`, e as funções `txt`, `rect`, `header`, `footer`, `table` com as mesmas assinaturas de `scripts/gerar_slides_hot_topics.py`

Este módulo é a extração das primitivas visuais já validadas. `gerar_slides_hot_topics.py` **não** é modificado — é um deliverable de 2026-08-07 já entregue, e mantém a própria cópia.

- [ ] **Step 1: Criar o módulo**

Copiar de `scripts/gerar_slides_hot_topics.py` as constantes de identidade (linhas ~20-33) e as funções `txt`, `rect`, `header`, `footer` e `table` (linhas ~36-160) para um novo `scripts/deck_caveo.py`, com este cabeçalho:

```python
#!/usr/bin/env python3
"""Primitivas visuais dos decks da Caveo — verde 0E8A5F, Calibri, 16:9.

Extraído de scripts/gerar_slides_hot_topics.py para ser compartilhado pelos
geradores recorrentes. Aquele script mantém a própria cópia por ora: é um
deliverable já entregue e refatorá-lo agora só adicionaria risco.
"""
```

Acrescentar uma constante que o gerador semanal precisa e o script original não tinha:

```python
# Amarelo do status 🟡, para as tabelas de benchmark do deck semanal.
AMARELO = RGBColor(0xC8, 0x86, 0x00)
```

- [ ] **Step 2: Verificar que o módulo importa e desenha**

Run:
```bash
python3 -c "
import sys; sys.path.insert(0, 'scripts')
from pptx import Presentation
from deck_caveo import SLIDE_H, SLIDE_W, footer, header, table, txt
prs = Presentation(); prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
s = prs.slides.add_slide(prs.slide_layouts[6])
header(s, 1, 'teste', 'Título', 'mensagem única')
table(s, __import__('pptx.util', fromlist=['Inches']).Inches(0.6),
      __import__('pptx.util', fromlist=['Inches']).Inches(2.0),
      __import__('pptx.util', fromlist=['Inches']).Inches(12.1),
      ['A', 'B'], [['x', '1']], [3, 1])
footer(s, 'rodapé')
prs.save('/tmp/deck_caveo_smoke.pptx'); print('OK')
"
```
Expected: `OK`

- [ ] **Step 3: Confirmar que o script original segue intacto**

Run: `git diff --stat scripts/gerar_slides_hot_topics.py`
Expected: saída vazia (nenhuma modificação)

- [ ] **Step 4: Commit**

```bash
git add scripts/deck_caveo.py
git commit -m "feat(criativos-semanal): primitivas visuais compartilhadas dos decks"
```

---

### Task 8: Gerador do deck

**Files:**
- Create: `scripts/criativos_semanal/gerar_deck.py`

**Interfaces:**
- Consumes: `scripts/deck_caveo.py` (Task 7)
- Produces: `gerar(dados: dict, destino: Path) -> Path`

Formato de `dados` — este é o contrato que a skill preenche na Fase 5:

```python
{
  "periodo": {"mes_inicio": "2026-08-01", "mes_fim": "2026-08-18",
              "cria_inicio": "2026-08-05", "cria_fim": "2026-08-18"},
  "consolidado": [   # slide 01
    {"metrica": "Leads", "realizado": 312, "meta": 400,
     "pct_meta": 0.78, "ritmo": 1.10, "formato": "int"},
    # ... Investimento usa formato "brl", os demais "int"
  ],
  "funcionou": [     # slide 02 — 2 a 3 itens
    {"ad_name": "CAV082611SV1", "coorte": "madura", "entrou": "2026-08-06",
     "testamos": "...", "por_que": "...", "ensina": "...",
     "kpis": {"hook_rate": 0.34, "hold_rate_hook": 0.17,
              "ctr_link": 0.028, "cpa": 132.0},
     "status": {"hook_rate": "verde", "hold_rate_hook": "verde",
                "ctr_link": "verde", "cpa": "verde"}},
  ],
  "nao_funcionou": [ # slide 03 — 1 a 2 itens, mesma forma + "causa"
    {"ad_name": "...", "coorte": "...", "entrou": "...", "nivel_quebrado": "gancho",
     "causa": "...", "kpis": {...}, "status": {...}},
  ],
  "hipoteses": {     # slide 04
    "anterior": {"id": "S33-H2", "hipotese": "...", "aconteceu": "..."},
    "novas": [{"id": "S34-H1", "nivel": "gancho", "framework": "Angle→Hook→Format",
               "celula": "Rafael × D3 × problema", "hipotese": "...", "porque": "..."}],
  },
  "anexo": {
    "em_leitura": [{"ad_name": "...", "impressoes": 210}],
    "cobertura_utmcon": 0.84,
    "conjuntos_concorrentes": [{"adset": "...", "ads": ["...", "..."]}],
    "campanhas": ["[BOO] [MM] [FUNDO] [LEADS] [FRIO] Captação de Médicos"],
  },
}
```

- [ ] **Step 1: Escrever o gerador**

Criar `scripts/criativos_semanal/gerar_deck.py`:

```python
#!/usr/bin/env python3
"""Deck semanal de análise de criativo — 4 blocos + anexo.

Consome o dicionário montado pela skill criativos-semanal (Fase 5) e produz
outputs/criativos-semanal-AAAAMMDD-caveo/caveo-criativos-semanal.pptx
"""
import sys
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from deck_caveo import (AMARELO, CINZA, ESCURO, SLIDE_H, SLIDE_W,  # noqa: E402
                        VERDE, VERMELHO, footer, header, table, txt)

COR_STATUS = {"verde": VERDE, "amarelo": AMARELO,
              "vermelho": VERMELHO, "na": CINZA}
MARCA = {"verde": "OK", "amarelo": "ATENCAO", "vermelho": "CRITICO", "na": "n/d"}
ROTULO_NIVEL = {"gancho": "Gancho — os 3 primeiros segundos",
                "retencao": "Retenção — o meio da peça",
                "interesse": "Interesse — a promessa",
                "conversao": "Conversão — criativo x LP"}


def _pct(v):
    return "—" if v is None else f"{v * 100:.1f}%".replace(".", ",")


def _brl(v):
    return "—" if v is None else f"R$ {v:,.2f}".replace(",", "@").replace(
        ".", ",").replace("@", ".")


def _valor(v, formato):
    if v is None:
        return "—"
    return _brl(v) if formato == "brl" else f"{v:,}".replace(",", ".")


def _novo(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def slide_consolidado(prs, d):
    s = _novo(prs)
    p = d["periodo"]
    header(s, 1, "consolidado do mês", "Onde estamos no mês",
           f"Mídia paga de {p['mes_inicio']} a {p['mes_fim']}.")
    linhas = [[c["metrica"], _valor(c["realizado"], c["formato"]),
               _valor(c["meta"], c["formato"]), _pct(c["pct_meta"]),
               _pct(c["ritmo"])] for c in d["consolidado"]]
    table(s, Inches(0.6), Inches(1.95), Inches(12.13),
          ["Métrica", "Realizado", "Meta", "% da meta", "Ritmo"],
          linhas, [3, 2, 2, 2, 2])
    txt(s, Inches(0.6), Inches(5.9), Inches(12.13), Inches(0.6),
        "Ritmo = realizado ÷ (meta × dias decorridos ÷ dias do mês). "
        "Ritmo de 100% é o passo exato para bater a meta até o fim do mês.",
        size=10, italic=True, color=CINZA)
    footer(s, "Definições de MQL e SQL: docs/fundacao-dados.md")
    return s


def _bloco_criativo(s, y, item, *, mostrar_causa):
    """Um card de criativo: nome, coorte, os 4 KPIs e a narrativa."""
    txt(s, Inches(0.6), y, Inches(6.0), Inches(0.3),
        f"{item['ad_name']} · entrou em {item['entrou']} "
        f"· coorte {item['coorte']}", size=13, bold=True, color=ESCURO)
    x = Inches(7.0)
    for kpi, rotulo in (("hook_rate", "Hook"), ("hold_rate_hook", "Hold"),
                        ("ctr_link", "CTR"), ("cpa", "CPA")):
        st = item["status"][kpi]
        valor = item["kpis"][kpi]
        texto = _brl(valor) if kpi == "cpa" else _pct(valor)
        txt(s, x, y, Inches(1.4), Inches(0.24), rotulo, size=9, color=CINZA)
        txt(s, x, y + Inches(0.2), Inches(1.4), Inches(0.28),
            f"{texto} · {MARCA[st]}", size=11, bold=True, color=COR_STATUS[st])
        x += Inches(1.42)
    corpo = y + Inches(0.34)
    if mostrar_causa:
        txt(s, Inches(0.6), corpo, Inches(6.2), Inches(0.9),
            f"Nível quebrado: {ROTULO_NIVEL[item['nivel_quebrado']]}",
            size=10, bold=True, color=VERMELHO)
        txt(s, Inches(0.6), corpo + Inches(0.28), Inches(12.13), Inches(0.9),
            item["causa"], size=11, color=ESCURO, spacing=1.15)
    else:
        txt(s, Inches(0.6), corpo, Inches(12.13), Inches(0.9),
            f"O que testamos: {item['testamos']}", size=11, color=ESCURO)
        txt(s, Inches(0.6), corpo + Inches(0.3), Inches(12.13), Inches(0.9),
            f"Por que funcionou: {item['por_que']}", size=11, color=ESCURO)
        txt(s, Inches(0.6), corpo + Inches(0.6), Inches(12.13), Inches(0.9),
            f"O que ensina sobre o médico PJ: {item['ensina']}",
            size=11, bold=True, color=VERDE, spacing=1.15)


def slide_funcionou(prs, d):
    s = _novo(prs)
    header(s, 2, "o que funcionou", "Os destaques da janela",
           "Destaque sai da coorte madura, que já passou a fase de aprendizado.")
    itens = d["funcionou"]
    if not itens:
        txt(s, Inches(0.6), Inches(2.4), Inches(12.13), Inches(0.6),
            "Nenhum criativo da janela atingiu volume e desempenho para virar "
            "destaque. Preferimos dizer isso a promover peça antiga.",
            size=13, italic=True, color=CINZA, spacing=1.2)
    y = Inches(2.05)
    for item in itens:
        _bloco_criativo(s, y, item, mostrar_causa=False)
        y += Inches(1.62)
    footer(s, "Piso de leitura: 500 impressões. Abaixo disso, o criativo vai para o anexo.")
    return s


def slide_nao_funcionou(prs, d):
    s = _novo(prs)
    header(s, 3, "o que não funcionou", "O que aprendemos com o que caiu",
           "O produto aqui é aprendizado sobre o médico PJ, não justificativa.")
    itens = d["nao_funcionou"]
    if not itens:
        txt(s, Inches(0.6), Inches(2.4), Inches(12.13), Inches(0.6),
            "Nenhum criativo com volume suficiente ficou abaixo do benchmark "
            "na janela.", size=13, italic=True, color=CINZA)
    y = Inches(2.05)
    for item in itens:
        _bloco_criativo(s, y, item, mostrar_causa=True)
        y += Inches(1.85)
    footer(s, "A causa vem da cascata: o primeiro nível vermelho é o diagnóstico.")
    return s


def slide_hipoteses(prs, d):
    s = _novo(prs)
    header(s, 4, "hipóteses", "O que testar na semana seguinte",
           "Cada hipótese nasce de um nível quebrado, não de brainstorm solto.")
    ant = d["hipoteses"]["anterior"]
    y = Inches(1.95)
    if ant:
        txt(s, Inches(0.6), y, Inches(12.13), Inches(0.28),
            f"A hipótese da semana passada ({ant['id']})",
            size=11, bold=True, color=CINZA)
        txt(s, Inches(0.6), y + Inches(0.26), Inches(12.13), Inches(0.3),
            ant["hipotese"], size=11, color=ESCURO)
        txt(s, Inches(0.6), y + Inches(0.54), Inches(12.13), Inches(0.3),
            f"O que aconteceu: {ant['aconteceu']}", size=11,
            bold=True, color=VERDE)
        y += Inches(1.05)
    linhas = [[h["id"], ROTULO_NIVEL[h["nivel"]].split(" — ")[0],
               h["framework"], h["celula"], h["hipotese"]]
              for h in d["hipoteses"]["novas"]]
    table(s, Inches(0.6), y, Inches(12.13),
          ["ID", "Nível", "Framework", "Célula PDA", "Hipótese"],
          linhas, [1, 1.4, 2, 2.4, 6])
    footer(s, "Célula PDA = Persona × Desire × Awareness ainda não testada (matriz.py).")
    return s


def slide_anexo(prs, d):
    s = _novo(prs)
    a = d["anexo"]
    header(s, 5, "anexo", "Ressalvas e leitura em andamento",
           "O que ainda não dá para afirmar, e por quê.")
    y = Inches(1.95)
    txt(s, Inches(0.6), y, Inches(12.13), Inches(0.28),
        "Ainda em leitura — abaixo de 500 impressões", size=11,
        bold=True, color=CINZA)
    em_leitura = a["em_leitura"]
    txt(s, Inches(0.6), y + Inches(0.26), Inches(12.13), Inches(0.4),
        ", ".join(f"{i['ad_name']} ({i['impressoes']} impr.)"
                  for i in em_leitura) or "nenhum",
        size=10, color=ESCURO)
    y += Inches(0.85)

    cob = a["cobertura_utmcon"]
    cor = VERDE if cob >= 0.8 else VERMELHO
    txt(s, Inches(0.6), y, Inches(12.13), Inches(0.28),
        "Cobertura de UtmCon__c", size=11, bold=True, color=CINZA)
    txt(s, Inches(0.6), y + Inches(0.26), Inches(12.13), Inches(0.4),
        f"{_pct(cob)} das oportunidades pagas têm criativo identificado."
        + ("" if cob >= 0.8 else " Abaixo de 80%: o ranking de funil é indicativo."),
        size=10, color=cor)
    y += Inches(0.85)

    txt(s, Inches(0.6), y, Inches(12.13), Inches(0.28),
        "Conjuntos com criativos concorrentes", size=11, bold=True, color=CINZA)
    conc = a["conjuntos_concorrentes"]
    txt(s, Inches(0.6), y + Inches(0.26), Inches(12.13), Inches(0.5),
        "; ".join(f"{c['adset']}: {', '.join(c['ads'])}" for c in conc)
        or "nenhum — cada conjunto tem um conceito distinto",
        size=10, color=ESCURO, spacing=1.15)
    y += Inches(0.95)

    txt(s, Inches(0.6), y, Inches(12.13), Inches(0.28),
        "Campanhas incluídas", size=11, bold=True, color=CINZA)
    txt(s, Inches(0.6), y + Inches(0.26), Inches(12.13), Inches(0.7),
        " · ".join(a["campanhas"]), size=9.5, color=CINZA, spacing=1.15)
    footer(s, "O Meta suprime entrega de peças repetitivas no mesmo conjunto (Andromeda).")
    return s


def gerar(dados, destino):
    prs = Presentation()
    prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
    for build in (slide_consolidado, slide_funcionou, slide_nao_funcionou,
                  slide_hipoteses, slide_anexo):
        build(prs, dados)
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    prs.save(destino)
    return destino
```

- [ ] **Step 2: Rodar com dados de exemplo**

Run:
```bash
python3 -c "
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
from gerar_deck import gerar
d = {
 'periodo': {'mes_inicio':'2026-08-01','mes_fim':'2026-08-18',
             'cria_inicio':'2026-08-05','cria_fim':'2026-08-18'},
 'consolidado': [
   {'metrica':'Investimento','realizado':41200,'meta':60000,'pct_meta':0.69,'ritmo':0.98,'formato':'brl'},
   {'metrica':'Leads','realizado':312,'meta':400,'pct_meta':0.78,'ritmo':1.10,'formato':'int'},
   {'metrica':'MQL','realizado':298,'meta':350,'pct_meta':0.85,'ritmo':1.20,'formato':'int'},
   {'metrica':'SQL','realizado':74,'meta':100,'pct_meta':0.74,'ritmo':1.05,'formato':'int'},
   {'metrica':'Fechamentos','realizado':19,'meta':28,'pct_meta':0.68,'ritmo':0.96,'formato':'int'}],
 'funcionou': [{'ad_name':'CAV082611SV1','coorte':'madura','entrou':'2026-08-06',
   'testamos':'Comparação cronológica: mandar mensagem pro contador x emitir no app.',
   'por_que':'O gancho mostra a espera, que é a dor concreta do dia a dia.',
   'ensina':'O médico compra tempo de volta antes de comprar economia de imposto.',
   'kpis':{'hook_rate':0.34,'hold_rate_hook':0.17,'ctr_link':0.028,'cpa':132.0},
   'status':{'hook_rate':'verde','hold_rate_hook':'verde','ctr_link':'verde','cpa':'verde'}}],
 'nao_funcionou': [{'ad_name':'CAV05263','coorte':'madura','entrou':'2026-08-07',
   'nivel_quebrado':'gancho','causa':'Abre com a marca em vez da dor. O médico não para para ver logotipo.',
   'kpis':{'hook_rate':0.11,'hold_rate_hook':0.09,'ctr_link':0.004,'cpa':None},
   'status':{'hook_rate':'vermelho','hold_rate_hook':'vermelho','ctr_link':'vermelho','cpa':'na'}}],
 'hipoteses': {'anterior':{'id':'S33-H2','hipotese':'Gancho de prazo (72h) supera gancho de preço.',
   'aconteceu':'Confirmado: hook 34% x 21%.'},
   'novas':[{'id':'S34-H1','nivel':'gancho','framework':'Angle→Hook→Format',
             'celula':'Rafael x D3 x problema','hipotese':'Abrir com o plantão como moeda.','porque':'x'}]},
 'anexo': {'em_leitura':[{'ad_name':'CAV08266SV1','impressoes':113}],
   'cobertura_utmcon':0.84,'conjuntos_concorrentes':[],
   'campanhas':['[BOO] [MM] [FUNDO] [LEADS] [FRIO] Captação de Médicos']},
}
print(gerar(d, '/tmp/deck_semanal_smoke.pptx'))
"
```
Expected: caminho impresso, arquivo criado

- [ ] **Step 3: Abrir e conferir visualmente**

Run: `open /tmp/deck_semanal_smoke.pptx`
Expected: 5 slides, sem texto sobreposto ou cortado, cores 🔴🟡🟢 corretas nos KPIs. Ajustar coordenadas se algo colidir.

- [ ] **Step 4: Commit**

```bash
git add scripts/criativos_semanal/gerar_deck.py
git commit -m "feat(criativos-semanal): gerador do deck de 4 blocos + anexo"
```

---

### Task 9: Agente `analista-criativo`

**Files:**
- Create: `.claude/agents/analista-criativo.md`

**Interfaces:**
- Consumes: os vereditos e nomes de nível da Task 2 (`gancho`/`retencao`/`interesse`/`conversao`; `escalar`/`iterar`/`matar`/`inconclusivo`/`fora_criativo`)
- Produces: o agente registrado como `subagent_type: analista-criativo`

- [ ] **Step 1: Escrever o agente**

Criar `.claude/agents/analista-criativo.md` com frontmatter e as três camadas. O `description` é o que decide o roteamento, então precisa dizer o que ele faz e o que não faz:

```markdown
---
name: analista-criativo
description: Analista de criativo de performance de Meta Ads da Caveo. Julga cada criativo pelo framework de teste (hook rate, hold rate, CTR link, CPA), aplica a cascata diagnóstica para achar em que nível a peça quebra, e transforma isso em aprendizado sobre o médico PJ e em hipóteses de teste. Não escreve copy (isso é do agente criativos) e não define benchmark de funil (isso é do analista-midia-paga-crm). Use para a análise semanal de criativo e para decidir escalar, iterar ou matar uma peça.
---

# AGENTE: Analista de Criativo — Caveo
```

O corpo tem três seções, `## D — DIRECTIVE`, `## O — ORCHESTRATION` e `## E — EXECUTION`. As tabelas citadas abaixo existem **verbatim** em dois lugares que você já tem: a de benchmarks e a ordem da cascata estão em **Global Constraints** no topo deste plano; as demais estão nas seções nomeadas do spec (`docs/superpowers/specs/2026-08-19-analista-criativo-design.md`). Copie de lá em vez de reescrever — números redigitados divergem.

**D — DIRECTIVE** contém: a identidade ("a pergunta que você responde é sempre *o que este número ensina sobre o médico PJ?*, nunca *este criativo foi bom?*"); a tabela de benchmarks exatamente como em Global Constraints acima; a nota sobre o hold rate ter dois denominadores, com p75÷views 3s como régua oficial e p75÷impressões exibido ao lado porque as fontes públicas de mercado usam o segundo e a comparação direta é inválida; as fontes de conhecimento (`docs/personas_medico.md`, `docs/Dores_Desejos_Publicos_Caveo.md`, `docs/Mapa_Tematico_Pilares_Criativos_Caveo.md`, `docs/fundacao-dados.md`); e as 5 regras invioláveis do spec §4.1 — nunca declarar vencedor abaixo de 500 impressões, nunca inventar número, nunca escrever copy, nunca justificar performance (com o exemplo do que passa e do que não passa), nunca duplicar benchmark de funil.

**O — ORCHESTRATION** contém: a tabela da cascata do spec §4.2 com os quatro padrões; a regra do 🟡 (não interrompe a cascata; amarelo em tudo é `iterar`, não validado); a regra `matar` × `iterar` (mata o ângulo quando já tem 2+ hooks e todos reprovados no gancho); a tabela de acionamentos (`analista-midia-paga-crm` para funil por `UtmCon__c`, sempre; `criativos` para escrever hooks, sempre; `tracking-conversoes` só no padrão tudo 🟢 + CPA 🔴); e a tabela do spec §5.2 ligando nível quebrado → framework de ideação.

**E — EXECUTION** contém: o formato de saída (um bloco por criativo com KPIs, status, nível quebrado, veredito e o aprendizado); o modelo do bloco `HANDOFF → criativos` incluindo diagnóstico, estrutura de copy recomendada (PAS/BAB/4 Ps) e células PDA livres; e o checklist de auto-verificação do spec §4.3.

Incluir a nota de procedência do PDA (§5.1 do spec) na camada O, onde a matriz é citada.

- [ ] **Step 2: Verificar que o agente carrega**

Run: `head -5 .claude/agents/analista-criativo.md`
Expected: frontmatter com `name: analista-criativo`

Verificar que o `description` menciona explicitamente o que o agente **não** faz — é isso que impede o orquestrador de mandar pedido de copy para cá.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/analista-criativo.md
git commit -m "feat(criativos-semanal): agente analista-criativo em 3 camadas DOE"
```

---

### Task 10: Skill `criativos-semanal`

**Files:**
- Create: `.claude/skills/criativos-semanal.md`
- Create: `.claude/commands/criativos-semanal.md`

**Interfaces:**
- Consumes: todos os módulos das Tasks 1–8 e o agente da Task 9
- Produces: a skill invocável por `/criativos-semanal`

- [ ] **Step 1: Escrever a skill**

Criar `.claude/skills/criativos-semanal.md` seguindo a estrutura de `.claude/skills/acompanhamento-diario-caveo.md` (contas → fonte única de regras → tabela de fases → uma seção por fase).

Frontmatter:

```markdown
---
name: criativos-semanal
description: Análise semanal de criativos de Meta Ads da Caveo. Coleta performance por anúncio dos últimos 14 dias, calcula o framework de teste (hook rate, hold rate, CTR link, CPA), classifica cada criativo pela cascata diagnóstica, cruza com o funil do Salesforce por utm_content e gera um deck .pptx de 4 blocos — consolidado do mês, o que funcionou, o que não funcionou e hipóteses da semana seguinte. Use toda semana ou quando precisar decidir escalar, iterar ou matar criativos.
---
```

Conteúdo por seção:

**Contas e fonte única de regras** — Meta `act_438086148409254`, Salesforce `caveo.my.salesforce.com`; canal/estágios/duas datas vêm de `docs/fundacao-dados.md`, com a ressalva do spec §2.1: para atribuição **por criativo**, só cpc direto, sem o ramo de cruzamento, porque cruzamento não tem `UtmCon__c`. Benchmarks de criativo vêm do agente `analista-criativo`; benchmarks de funil do `analista-midia-paga-crm`.

**Tabela "quando o usuário pede algo, identifique a fase"** — no formato da `reporte-semanal-caveo.md`: "roda a análise semanal" → todas; "só coleta" → 0+1; "gera o deck" com análise pronta → 5.

**Fase 0 — Escopo e metas.** A tabela de variáveis do spec §6.2 (`CRIA_END` = TODAY−1, `CRIA_START` = TODAY−14, `MES_START` = dia 01, `MES_END` = TODAY−1), a explicação das duas coortes, e o bloco de confirmação a apresentar antes de qualquer chamada de API:

```
Janela criativa:  [CRIA_START] a [CRIA_END]  (coorte madura [..] · recente [..])
Consolidado:      [MES_START] a [MES_END]

Metas do mês — me passa os cinco números:
  Leads: ___  MQL: ___  SQL: ___  Fechamentos: ___  Investimento: R$ ___
```

Carregar o registro com `registro.ler()` nesta fase, para ter `hooks_por_angulo` disponível na Fase 2.

**Fase 1 — Coleta.** A tabela 1A–1E do spec §6.3, com os parâmetros exatos de cada chamada MCP. Marcar explicitamente: **sem filtro de campanha**; **1C só dos anúncios que entram no deck**, porque `get_ad_creatives` é uma chamada por anúncio; **1D é o helper**, com o comando:

```bash
python3 -c "
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
from meta_video import insights_video, token
import json; print(json.dumps(insights_video('[CRIA_START]', '[CRIA_END]', token())))
"
```

Para 1E, o funil por criativo. **Só Meta e só cpc direto** — Google está fora do escopo desta skill (spec §10) e o ramo de cruzamento da fundação não tem `UtmCon__c` preenchido (spec §2.1):

```sql
SELECT UtmCon__c, StageName, COUNT(Id) qtd
FROM Opportunity
WHERE CreatedDate >= [CRIA_START]T00:00:00-03:00
  AND CreatedDate <= [CRIA_END]T23:59:59-03:00
  AND UtmMed__c LIKE '%cpc%'
  AND (NOT UtmSou__c LIKE '%google%')
GROUP BY UtmCon__c, StageName
```

E a cobertura, que vira ressalva no deck quando fica abaixo de 80%:

```sql
SELECT COUNT(Id) total, COUNT(UtmCon__c) com_criativo
FROM Opportunity
WHERE CreatedDate >= [CRIA_START]T00:00:00-03:00
  AND CreatedDate <= [CRIA_END]T23:59:59-03:00
  AND UtmMed__c LIKE '%cpc%'
  AND (NOT UtmSou__c LIKE '%google%')
```

`cobertura_utmcon = com_criativo ÷ total`. Agrupar os `StageName` em MQL/SQL/Ganho pelos grupos de estágio da fundação — **não** redefinir a lista aqui.

**Fase 2 — Cálculo.** O bloco Python que junta tudo:

```python
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
from datetime import date
import coorte, framework, matriz, registro

REG = registro.ler(registro.CAMINHO_PADRAO)
HOOKS = matriz.hooks_por_angulo(REG)
REF = date.fromisoformat("[HOJE]")

# ANUNCIOS: saída de meta_video.insights_video, com "created_time" e
# "angulo" (do registro, quando já conhecido) acrescentados por anúncio.
avaliados = [framework.avaliar(a, HOOKS.get(a.get("angulo"), 0)) for a in ANUNCIOS]
grupos = coorte.agrupar(avaliados, REF)
livres = matriz.celulas_livres(REG)
mortos = matriz.angulos_mortos(REG)
```

**Fase 3 — Julgamento.** Acionar o agente `analista-criativo` com a tabela já classificada. Ele produz os blocos 2 e 3. Regra de escolha: destaque sai preferencialmente da coorte `madura`.

Nesta fase também sai o **check de diversidade (Andromeda)** do spec §5.4, que preenche `anexo.conjuntos_concorrentes`. Ele é **julgamento, não cálculo** — semelhança conceitual entre dois criativos não é computável a partir das métricas, e por isso não virou função Python. O agente agrupa os anúncios avaliados por `adset_id`, lê o conteúdo trazido pela coleta 1C e sinaliza os conjuntos em que dois ou mais criativos atacam a mesma dor com a mesma promessa. Se um conjunto tem só um anúncio, ou se os anúncios são conceitualmente distintos, a lista sai vazia — e o deck diz isso.

**Fase 4 — Ideação.** `HANDOFF → criativos` com diagnóstico, estrutura de copy recomendada e as células PDA livres (excluindo os ângulos mortos).

**Fase 5 — Deck e registro.** Montar o dicionário do contrato da Task 8, chamar `gerar_deck.gerar()` com destino `outputs/criativos-semanal-[AAAAMMDD]-caveo/caveo-criativos-semanal.pptx`, e gravar as linhas novas com `registro.acrescentar()`.

Uma linha por criativo avaliado na janela, com **todas** estas chaves — `matriz.py` depende de `persona`, `desire`, `awareness`, `angulo`, `hook` e `nivel_quebrado`, e o slide 04 depende de `hipotese_origem`:

```json
{"ad_id": "120246069173850088", "ad_name": "CAV082611SV1", "entrou": "2026-08-12",
 "persona": "Rafael", "desire": "D3", "awareness": "problema",
 "angulo": "plantão como moeda", "hook": "abre com o plantão", "formato": "video",
 "hipotese_origem": "S33-H2", "impressoes": 4210,
 "hook_rate": 0.24, "hold_rate_hook": 0.11, "hold_rate_impr": 0.026,
 "ctr_link": 0.019, "cpa": 163.40,
 "veredito": "iterar", "nivel_quebrado": "conversao"}
```

`persona`, `desire`, `awareness`, `angulo`, `hook` e `formato` são **classificação do agente**, não vêm da API — é isso que dá memória à matriz PDA. `hipotese_origem` usa `S<semana ISO>-H<n>` e é `null` para criativo que não nasceu de hipótese registrada. Gravar só criativos com `veredito != "inconclusivo"`: registrar peça sem leitura suja a matriz com célula que não foi de fato testada.

**Casos de borda** — a tabela do spec §9 inteira, com o comportamento de cada situação.

- [ ] **Step 2: Escrever o comando de chat**

Criar `.claude/commands/criativos-semanal.md`, no padrão exato de `.claude/commands/dados-lp-caveo.md`:

```markdown
---
description: Análise semanal de criativos de Meta Ads → deck .pptx de 4 blocos
argument-hint: [data de referência opcional YYYY-MM-DD]
---

Invoque a skill `criativos-semanal` para esta tarefa. Argumentos do usuário (se houver): $ARGUMENTS
```

- [ ] **Step 3: Conferir consistência com os módulos**

Verificar que todo nome citado na skill existe de fato no código:

Run:
```bash
python3 -c "
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
import coorte, framework, matriz, registro, gerar_deck
for m, nomes in ((framework, ['avaliar','kpis','status','nivel_quebrado','MIN_IMPRESSOES']),
                 (coorte, ['agrupar','coorte_de','janela']),
                 (matriz, ['celulas_livres','hooks_por_angulo','angulos_mortos']),
                 (registro, ['ler','acrescentar','CAMINHO_PADRAO']),
                 (gerar_deck, ['gerar'])):
    faltando = [n for n in nomes if not hasattr(m, n)]
    assert not faltando, (m.__name__, faltando)
print('OK — todos os nomes citados na skill existem')
"
```
Expected: `OK — todos os nomes citados na skill existem`

- [ ] **Step 4: Rodar a suíte completa**

Run: `python3 -m pytest scripts/criativos_semanal -q`
Expected: PASS, 52 testes

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/criativos-semanal.md .claude/commands/criativos-semanal.md
git commit -m "feat(criativos-semanal): skill de análise semanal e comando de chat"
```

---

### Task 11: Registrar no mapa do projeto

**Files:**
- Modify: `docs/projeto-mapa.md`

O CLAUDE.md dá à sessão raiz o papel de guardiã de organização, e `docs/projeto-mapa.md` é o índice vivo de "onde está o quê". Uma entrega que não entra no mapa fica invisível para o próximo onboarding.

- [ ] **Step 1: Acrescentar o agente ao índice**

Na tabela "Índice de agentes (para roteamento do orquestrador)", acrescentar a linha:

```markdown
| `analista-criativo` | análise semanal de criativo, framework de teste, decidir escalar/iterar/matar | escrever copy, benchmark de funil |
```

- [ ] **Step 2: Acrescentar as peças à árvore de pastas**

Na seção `.claude/agents/`, acrescentar:

```
│   │   ├── analista-criativo.md       #   framework de teste + cascata + hipóteses (DOE)
```

Na seção `.claude/skills/`, acrescentar:

```
│   │   ├── criativos-semanal.md        (procedimento; semanal Meta → deck .pptx de 4 blocos)
```

Na seção `scripts/`, acrescentar:

```
│   ├── criativos_semanal/              #   helper da skill criativos-semanal (puros + I/O + testes)
│   └── deck_caveo.py                   #   primitivas visuais compartilhadas dos decks
```

- [ ] **Step 3: Acrescentar a nota de roteamento ao CLAUDE.md**

Em `CLAUDE.md`, na tabela "Sinal na pergunta → Rotear para", acrescentar a linha:

```markdown
| Julgar criativo pelo framework de teste (hook/hold/CTR/CPA), decidir escalar/iterar/matar, hipótese de teste | `analista-criativo` |
```

- [ ] **Step 4: Verificar a fundação**

Run: `npm run docs:check`
Expected: PASS — esta entrega não toca `config/business-rules.ts`, então a checagem tem de continuar verde.

- [ ] **Step 5: Commit**

```bash
git add docs/projeto-mapa.md CLAUDE.md
git commit -m "docs: registra analista-criativo e criativos-semanal no mapa do projeto"
```

---

## Verificação final

- [ ] `python3 -m pytest scripts/criativos_semanal -q` → 52 testes passando
- [ ] `python3 -m pytest scripts/acompanhamento_diario scripts/dados_lp -q` → suítes existentes intactas
- [ ] `npm run docs:check` → verde
- [ ] `git diff --stat scripts/gerar_slides_hot_topics.py` → vazio (deliverable antigo não foi tocado)
- [ ] Uma execução real da skill de ponta a ponta, com o deck aberto e conferido
- [ ] `data/criativos_registro.jsonl` criado com as linhas da primeira execução

## Pendência conhecida para a primeira execução

O registro nasce vazio. Os criativos que já estão rodando na conta não têm
`persona`, `desire`, `awareness` nem `angulo` classificados — então
`matriz.celulas_livres()` vai tratar como livres células que na prática já
foram gastas, e `hooks_por_angulo()` vai devolver 0 para todo ângulo, o que
impede o veredito `matar` de aparecer no primeiro ciclo.

**Ação na primeira execução:** classificar manualmente os criativos ativos e
gravá-los no registro antes de confiar na matriz. Isso é trabalho de análise, não
de código, e por isso não vira task deste plano.
