---
name: criativos-semanal
description: Análise semanal de criativos de Meta Ads da Caveo. Coleta performance por anúncio dos últimos 14 dias, calcula o framework de teste (hook rate, hold rate, CTR link, CPA), classifica cada criativo pela cascata diagnóstica, cruza com o funil do Salesforce por utm_content e gera um deck .pptx de 4 blocos — consolidado do mês, o que funcionou, o que não funcionou e hipóteses da semana seguinte. Use toda semana ou quando precisar decidir escalar, iterar ou matar criativos.
---

# Skill: Análise Semanal de Criativos — Caveo

Transforma performance de criativo em **aprendizado sobre o médico PJ** e em
hipóteses de teste para a semana seguinte. O julgamento é do agente
**`analista-criativo`**; esta skill é o procedimento.

## Contas

| Plataforma | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Salesforce | `caveo.my.salesforce.com` |

## Fonte única de regras (LER ANTES DE QUALQUER SOQL)

Canal, estágios do funil, contratante e o modelo de duas datas vêm de
**`docs/fundacao-dados.md`** (gerada de `config/business-rules.ts`). Use os
fragmentos SOQL de lá. **Não reescreva** listas de UTM, de estágio ou a
definição de MQL/SQL nesta skill — se este arquivo divergir da fundação, a
fundação vence.

**Uma exceção, deliberada:** para atribuição **por criativo** usa-se **só cpc
direto**, sem o ramo de cruzamento. O cruzamento captura oportunidades sem UTM
confiável, que não têm `UtmCon__c` preenchido — ele adicionaria ruído sem
adicionar informação. Para números agregados de canal (bloco 1) vale a regra
normal da fundação.

Benchmarks de **criativo** são do agente `analista-criativo`. Benchmarks de
**funil** são do `analista-midia-paga-crm`. Nenhum dos dois se redefine aqui.

## Escopo

Só **Meta Ads**. O framework de teste acordado com o cliente é de Meta; Google
Ads está fora desta skill.

**Sem filtro de campanha** — todas as campanhas da conta são de conversão.

## Quando o usuário pede algo, identifique a fase

| Pedido | Fases |
|---|---|
| "roda a análise semanal de criativo" / "gera o deck semanal" | Todas (0 → 5) |
| "qual é a janela?" | Fase 0 apenas |
| "coleta os dados dos criativos" | Fases 0 + 1 |
| "classifica os criativos" com dados coletados | Fase 2 |
| "gera a análise" com a tabela pronta | Fase 3 |
| "levanta as hipóteses" | Fase 4 |
| "monta o deck" com tudo pronto | Fase 5 |

---

## Fase 0 — Escopo e metas

Calcular a partir de hoje (`TODAY`):

| Variável | Fórmula | Uso |
|---|---|---|
| `CRIA_END` | TODAY − 1 | fim da janela criativa |
| `CRIA_START` | TODAY − 14 | início da janela criativa |
| `MES_START` | dia 01 do mês corrente | início do consolidado |
| `MES_END` | TODAY − 1 | fim do consolidado |

A janela de 14 dias cobre **duas coortes de entrada**:

- **madura** — `D-14` a `D-8`. Já passou a fase de aprendizado de 5–7 dias; é de
  onde sai o destaque do bloco 2.
- **recente** — `D-7` a `D-1`. Leitura preliminar.

Carregar o registro histórico **nesta fase**, porque a Fase 2 precisa saber
quantos hooks cada ângulo já consumiu:

```python
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
import matriz, registro
REG = registro.ler(registro.CAMINHO_PADRAO)
HOOKS = matriz.hooks_por_angulo(REG)
LIVRES = matriz.celulas_livres(REG)
MORTOS = matriz.angulos_mortos(REG)
print(f"{len(REG)} criativos no registro · {len(LIVRES)} células PDA livres · {len(MORTOS)} ângulos mortos")
```

Apresentar para confirmação **antes de qualquer chamada de API**:

```
Janela criativa:  [CRIA_START] a [CRIA_END]
  coorte madura:  [CRIA_START] a [CRIA_START+6]
  coorte recente: [CRIA_START+7] a [CRIA_END]
Consolidado:      [MES_START] a [MES_END]

Metas do mês — me passa os cinco números:
  Leads: ___  MQL: ___  SQL: ___  Fechamentos: ___  Investimento: R$ ___
```

---

## Fase 1 — Coleta

Cinco coletas, **em paralelo** sempre que possível.

### 1A. Meta — performance por anúncio

**Ferramenta:** `mcp__meta-ads-mcp__get_insights`

- `account_id`: `act_438086148409254`
- `level`: `ad`
- `time_range`: `{"since": "[CRIA_START]", "until": "[CRIA_END]"}` — e uma
  segunda chamada com `{"since": "[MES_START]", "until": "[MES_END]"}` para o
  consolidado do bloco 1.

### 1B. Meta — data de inclusão dos criativos

**Ferramenta:** `mcp__meta-ads-mcp__get_ads` com `account_id` e `limit` alto.

Traz `created_time`, `adset_id`, `creative.id` e `status`. **É a única fonte de
`created_time`** — o endpoint de insights não devolve data de criação. Casar com
1A por `ad_id`.

### 1C. Meta — conteúdo do criativo

**Ferramenta:** `mcp__meta-ads-mcp__get_ad_creatives`, um `ad_id` por chamada.

**Só dos anúncios que vão entrar no deck** — os destaques, os casos de fracasso
e os candidatos ao check de diversidade. É uma chamada por anúncio; buscar os 40
da conta para usar 5 é desperdício.

Necessário porque os nomes de anúncio são códigos (`CAV082611SV1`) e não dizem
o que a peça comunica.

### 1D. Métricas de vídeo — helper na Graph API

O MCP do Meta tem lista de campos **fixa** e não expõe
`video_p*_watched_actions` nem `video_thruplay_watched_actions`. Sem eles não há
hold rate. Daí o helper:

```bash
python3 -c "
import sys, json; sys.path.insert(0, 'scripts/criativos_semanal')
from meta_video import insights_video, token
print(json.dumps(insights_video('[CRIA_START]', '[CRIA_END]', token())))
"
```

Devolve, por anúncio: `ad_id`, `ad_name`, `adset_id`, `campaign_name`,
`impressoes`, `views_3s`, `p75`, `link_clicks`, `registros`, `spend` — no
formato que `framework.avaliar` consome.

> Rodar da **raiz do repositório**: o helper lê o token de `.mcp.json` no
> diretório corrente.

### 1E. Salesforce — funil por criativo

Só Meta, só cpc direto (ver "Fonte única de regras"):

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

`cobertura_utmcon = com_criativo ÷ total`.

Agrupar os `StageName` em MQL/SQL/Ganho pelos **grupos de estágio da fundação**.
Não redefinir a lista aqui — ela muda por decisão do cliente e a fundação é
quem manda.

Para o **bloco 1** (consolidado do mês), a mesma lógica no período
`[MES_START]`–`[MES_END]`, com a regra normal da fundação (cpc + cruzamento),
porque ali o número é de canal, não de criativo.

---

## Fase 2 — Cálculo

Determinístico, em Python. Nada de contas na conversa.

```python
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
from datetime import date
import coorte, framework, matriz, registro

REF = date.fromisoformat("[HOJE]")

# ANUNCIOS = saída de 1D (meta_video.insights_video) com "created_time" (de 1B)
# e "angulo" (do registro, quando o criativo já for conhecido) acrescentados.
avaliados = [framework.avaliar(a, HOOKS.get(a.get("angulo"), 0)) for a in ANUNCIOS]
grupos = coorte.agrupar(avaliados, REF)

for a in sorted(avaliados, key=lambda x: -x["impressoes"]):
    print(f"{a['ad_name']:<16} impr {a['impressoes']:>7} "
          f"hook {a['hook_rate'] or 0:.1%} hold {a['hold_rate_hook'] or 0:.1%} "
          f"ctr {a['ctr_link'] or 0:.2%} "
          f"| {a['nivel_quebrado'] or '-':<10} {a['veredito']}")
```

Cada anúncio sai com os quatro KPIs, o hold rate nos dois denominadores, o
status 🔴🟡🟢 de cada KPI, o `nivel_quebrado` e o `veredito`.

---

## Fase 3 — Julgamento

Acionar o agente **`analista-criativo`** com a tabela já classificada. Ele
produz os blocos 2 e 3 — a narrativa do que funcionou, do que não funcionou e o
aprendizado sobre o médico PJ.

Regras de seleção:

- **Destaque** (bloco 2) sai preferencialmente da coorte **madura**.
- **Fracasso** (bloco 3) nunca sai de criativo `inconclusivo`.

### Check de diversidade (Andromeda)

Também nesta fase, e é **julgamento, não cálculo** — semelhança conceitual entre
duas peças não se extrai das métricas, por isso não virou função Python.

Agrupar os anúncios avaliados por `adset_id`, ler o conteúdo trazido em 1C e
sinalizar os conjuntos em que **dois ou mais criativos atacam a mesma dor com a
mesma promessa**. O Andromeda do Meta avalia cada peça individualmente e suprime
entrega de material repetitivo; peças gêmeas no mesmo conjunto competem entre si.

Conjunto com um anúncio só, ou com peças conceitualmente distintas, não entra na
lista — e o deck diz que não houve.

---

## Fase 4 — Ideação

`HANDOFF → criativos`, no formato definido na camada E do agente
`analista-criativo`. Carrega o diagnóstico, a **estrutura de copy recomendada**
(PAS, BAB ou 4 Ps, conforme o nível quebrado) e as **células PDA livres**,
excluindo os ângulos mortos.

O agente `criativos` é quem escreve headline, corpo e CTA — nunca esta skill,
nunca o `analista-criativo`.

---

## Fase 5 — Deck e registro

Montar o dicionário e gerar:

```python
import sys; sys.path.insert(0, 'scripts/criativos_semanal')
from gerar_deck import gerar
destino = "outputs/criativos-semanal-[AAAAMMDD]-caveo/caveo-criativos-semanal.pptx"
print(gerar(DADOS, destino))
```

A forma de `DADOS` está documentada no plano de implementação
(`docs/superpowers/plans/2026-08-19-analista-criativo.md`, Task 8) e nas
funções de slide de `gerar_deck.py`.

Depois, gravar o registro — **uma linha por criativo avaliado**:

```python
import registro
n = registro.acrescentar(registro.CAMINHO_PADRAO, LINHAS)
print(f"{n} criativos gravados no registro")
```

Schema de cada linha:

```json
{"ad_id": "120246069173850088", "ad_name": "CAV082611SV1", "entrou": "2026-08-12",
 "persona": "Rafael", "desire": "D3", "awareness": "problema",
 "angulo": "plantão como moeda", "hook": "abre com o plantão", "formato": "video",
 "hipotese_origem": "S33-H2", "impressoes": 4210,
 "hook_rate": 0.24, "hold_rate_hook": 0.11, "hold_rate_impr": 0.026,
 "ctr_link": 0.019, "cpa": 163.40,
 "veredito": "iterar", "nivel_quebrado": "conversao"}
```

`persona`, `desire`, `awareness`, `angulo`, `hook` e `formato` são
**classificação do agente**, não vêm da API — é isso que dá memória à matriz PDA.

**Os códigos D1–D7 são escopados por estágio de carreira.** Larissa e Diego são
início de carreira; Rafael e Camila são carreira consolidada. Resolver o código
no mapa do estágio da persona.

`hipotese_origem` usa `S<semana ISO>-H<n>`, ou `null` para criativo que não
nasceu de hipótese registrada.

**Gravar só criativos com `veredito != "inconclusivo"`.** Registrar peça sem
leitura suja a matriz com célula que na prática não foi testada — e ela some das
livres sem ter ensinado nada.

---

## Casos de borda

| Situação | Comportamento |
|---|---|
| Token do Meta expirado ou ausente | o helper falha alto; a skill **para**. Não gerar deck com retenção faltando em silêncio |
| Nenhum criativo novo na janela | blocos 2 e 3 saem vazios dizendo isso. Não promover criativo antigo a destaque para preencher slide |
| Anúncio estático (sem vídeo) | hook e hold = `n/a`; a cascata pula os dois primeiros níveis; julgamento por CTR e CPA |
| Cobertura de `UtmCon__c` < 80% | ressalva no slide 01 e no anexo; o ranking de funil vira indicativo |
| Todos os criativos < 500 impressões | deck sai só com bloco 1 e anexo, declarando que a semana não tem leitura |
| Registro JSONL inexistente | primeira execução cria o arquivo; a matriz trata todas as células como livres |
| Anúncio sem `UtmCon__c` correspondente no SF | entra na análise de plataforma (hook/hold/CTR), fica fora do ranking de funil, é contado na cobertura |

## Pendência da primeira execução

O registro nasce vazio. Os criativos já em veiculação não têm `persona`,
`desire`, `awareness` nem `angulo` classificados — então a matriz mostrará como
livres células que já foram gastas, e nenhum ângulo poderá receber o veredito
`matar` (que exige 2+ hooks no histórico).

Classificar manualmente os criativos ativos e gravá-los no registro antes de
confiar na matriz.
