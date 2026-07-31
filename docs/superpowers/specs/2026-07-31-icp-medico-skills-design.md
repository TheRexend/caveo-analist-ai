# Design — Camada agêntica: ICP vira Formando/Médico nas skills operacionais

> Data: 2026-07-31 · Sub-projeto 2 de 4 da reformulação de ICP (ver
> [[2026-07-31-icp-medico-fundacao-design.md]]). Depende da Fundação
> (`config/business-rules.ts`, sub-projeto 1 — PR #5 aberto contra `main`,
> ainda não mergeado; branch `worktree-icp-medico-fundacao`).

## 1. Contexto e problema

A Fundação de dados (sub-projeto 1) já substituiu a classificação RF/MM por
classificação direta em `TipCte__c` (`formando`/`medico`/`revalida`), sem
recência na lógica, e removeu `SEGMENT_ALLOCATION` (rateio institucional por
tag `[RF]`/`[MM]`) — mídia paga mira 100% em Médico.

Toda a camada agêntica que gera relatórios de mídia paga por segmento ainda
está 100% acoplada ao modelo antigo: quatro skills (e os scripts Python que as
sustentam) usam `"mm"`/`"rf"` como chaves literais em estruturas de planilha
(blocos por linha, nomes de aba), rateio de campanha por tag, e um espelho
Python de `classify_contratante` que ainda recebe `TipCte__c` + recência.

**Módulo-fonte compartilhado:** `scripts/acompanhamento_diario/segments.py` é
importado por todas as outras skills/scripts (`planilha_resultados/sheet.py`,
`reporte_ka/alloc.py`, `reconciliacao-fechamentos-caveo.md`) — atualizá-lo
primeiro é o que desbloqueia o resto, no mesmo espírito de "fundação → dependentes"
do sub-projeto 1.

## 2. Decisões de negócio fechadas com o usuário

- **Revalida não aparece nos relatórios de mídia paga.** Os blocos físicos das
  planilhas continuam com 2 segmentos (Formando/Médico), reaproveitando as
  linhas/colunas existentes — sem restruturação física, só renomeação de
  rótulo. `classify_contratante` (Python) continua retornando `"revalida"`
  fielmente (espelho completo da fundação), mas cada skill de relatório
  descarta esse valor antes de tabular, do mesmo jeito que hoje descartaria
  uma opp sem `TipCte__c`.
- **Fallback de campanha institucional vira 100% Médico.** Campanhas sem tag
  de segmento no nome (a maioria, daqui pra frente) contam inteiras como
  `"medico"` — sem split 50/50, sem rateio proporcional por participação de
  opps (não há mais dois segmentos disputando o mesmo orçamento). Campanhas
  antigas que ainda tenham a tag legada `[rf]`/`[mm]` no nome continuam sendo
  lidas por essa tag (compatibilidade), só que mapeadas para
  `"formando"`/`"medico"` respectivamente.
- **`criativos.md` (agente) fica fora deste sub-projeto.** Sua identidade
  inteira depende de docs de persona (`personas_recem_formados.md`,
  `personas_medico_maduro.md`) que só mudam no sub-projeto 4 — reescrever
  agora duplicaria trabalho.
- **`conversoes-oportunidade.md`** (LeadSource "LP MM"/"LP Turbo") fica fora
  de escopo — é nome de landing page/campo diferente de `TipCte__c`, fora do
  nosso controle unilateral.
- **As planilhas reais são renomeadas como parte da implementação** (abas e
  cabeçalhos de bloco), não deixado para depois — mantendo linhas/colunas
  intactas, com confirmação explícita antes de aplicar em cada planilha.
- **Dados históricos não são recalculados.** Linhas já gravadas antes da
  virada de ICP (2026-07-31) usaram a classificação antiga (RF por recência)
  e permanecem como estão — princípio append-only já estabelecido no projeto.
  Reconciliação de meses antigos pode mostrar diferença de metodologia, não
  erro de dado.

## 3. Abordagem escolhida

**Bottom-up por dependência (Abordagem A):** atualizar
`scripts/acompanhamento_diario/segments.py` primeiro, depois cada skill
dependente em ordem de acoplamento
(`acompanhamento-diario-caveo` → `planilha-resultados` → `reporte-resultados-ka`
→ `reconciliacao-fechamentos-caveo`), e por último os dois arquivos de baixo
acoplamento (`criativos-campeoes.md`, `analista-midia-paga-crm.md`) e a
renomeação das planilhas reais.

Alternativas descartadas:

- **B — skill por skill sem tocar o módulo compartilhado primeiro:**
  duplicaria a lógica de classificação em cada skill ou geraria
  inconsistência entre skills que importam a mesma função em momentos
  diferentes da migração.
- **C — tudo num commit só, sem checkpoints:** arriscado demais mexendo em 4
  skills produtivas (uma delas grava diariamente) e em planilhas reais ao
  mesmo tempo, sem pontos de rollback intermediários.

## 4. Módulo-fonte: `scripts/acompanhamento_diario/segments.py`

**Classificação de oportunidade** — mirror exato e completo da fundação TS
(`classifyContratante`):

```python
def classify_contratante(tip_cte: str | None) -> str | None:
    if tip_cte == "Formando": return "formando"
    if tip_cte == "Médico": return "medico"
    if tip_cte == "Revalida": return "revalida"
    return None
```

Perde o parâmetro `tempo_de_formado` (recência não participa mais da
classificação). Remove `RF_SEGMENTS`, `MM_SEGMENTS`, `SPLIT_SEGMENT`,
`RF_RECENCY_VALUES` — não fazem mais sentido com classificação direta.

**Classificação de campanha (`classify_segment`) e rateio (`allocate`)** —
mecanismo que não existe mais na fundação TS (o `SEGMENT_ALLOCATION` foi
removido no sub-projeto 1); vira puramente um shim de compatibilidade
Python-only com nomes de campanha legados:

```python
TAG_FORMANDO = "[rf]"   # tag legada — campanhas antigas podem ainda ter esse nome
TAG_MEDICO = "[mm]"     # tag legada — idem

def classify_segment(campaign_name: str) -> str:
    name = campaign_name.lower()
    if TAG_FORMANDO in name: return "formando"
    if TAG_MEDICO in name: return "medico"
    return "medico"  # sem tag = institucional = 100% Médico, sem split
```

`allocate` perde a lógica de rateio proporcional por participação de opps —
campanha sem tag conta 100% como `"medico"`, sem cálculo de proporção nem
fallback 50/50. Simplificação real: menos um caminho de cálculo pra manter.

## 5. Skills dependentes

Troca mecânica de chave em cada estrutura que hoje usa `"mm"`/`"rf"`, sem
mudar a forma dos dados (linhas/colunas físicas não se movem):

**`scripts/acompanhamento_diario/sheet.py`** (planilha "Resultados Mês Atual"):
```python
BLOCK_BASE = {"medico": 45, "formando": 87}  # era {"mm": 45, "rf": 87}
```
`day_to_row`, `cell_updates`, `write_updates`, `read_fechamentos` mantêm
assinatura, só trocam as chaves internas. `read_fechamentos` retorna
`{"medico": {...}, "formando": {...}}`.

**`scripts/planilha_resultados/sheet.py`** (planilha "Relação de Leads"):
```python
BLOCK_BASE = {"medico": 0, "formando": 28}  # era {"mm": 0, "rf": 28}
```
Bloco Médico continua nas linhas 30-53 (offset 0); Formando continua nas
linhas 58-81 (offset +28) — só chave e rótulo mudam, não a posição física.

**`scripts/reporte_ka/alloc.py`**: `allocate_row(name, metrics, opp_medico, opp_formando)`
(parâmetros renomeados), reusa o `classify_segment` simplificado da seção 4.

**`scripts/reporte_ka/sheet.py`**:
```python
TABS = {"formando": "Mês-a-Mês Formando", "medico": "Mês-a-Mês Médico"}
# era {"rf": "Mês-a-Mês RF", "mm": "Mês-a-Mês MM"}
```

**`.claude/skills/reconciliacao-fechamentos-caveo.md`**: itera
`seg in ("medico", "formando")` em vez de `("mm", "rf")`; compara
`ledger[seg]` (planilha) × `live[seg]` (SF agora, via `classify_contratante`
novo).

**`.claude/skills/reporte-resultados-ka.md`**: os fragmentos SOQL literais
`TIPCTE_RF`/`TIPCTE_MM` embutidos no texto da skill (hoje reescrevem a regra
antiga) são substituídos por referência direta a `docs/fundacao-dados.md`
seção 4 — mesmo princípio já seguido por `analista-midia-paga-crm.md` (não
duplicar a regra da fundação, apontar pra ela).

## 6. Planilhas reais (renomeação ao vivo)

Renomear, mantendo linhas/colunas intactas:

| Planilha | De | Para |
|---|---|---|
| "Relação de Leads" | cabeçalho de bloco "MÉDICO MADURO" (linha ~29) | "MÉDICO" |
| "Relação de Leads" | cabeçalho de bloco "RECÉM-FORMADOS" (linha ~57) | "FORMANDO" |
| aba "Mês-a-Mês RF" | nome da aba | "Mês-a-Mês Formando" |
| aba "Mês-a-Mês MM" | nome da aba | "Mês-a-Mês Médico" |
| "Resultados Mês Atual" | cabeçalhos de bloco nas linhas base 45/87 (texto atual a confirmar ao vivo) | equivalentes "MÉDICO"/"FORMANDO" |

Executado via o mesmo mecanismo de escrita que as skills já usam
(gspread/credenciais existentes) — ação explícita, confirmada por planilha
antes de aplicar. Só o texto do cabeçalho/nome da aba muda; dados, fórmulas e
posições ficam intactos.

## 7. Ajustes leves (baixo acoplamento)

**`.claude/skills/criativos-campeoes.md`**: única menção é textual, na
pergunta de escopo da Fase 0 — "contratante (RF/MM/ambos)" vira "contratante
(Formando/Médico/ambos)". Nenhuma lógica de ranking muda (ranking é por
`UtmCon__c`, não por segmento).

**`.claude/agents/analista-midia-paga-crm.md`**: uma linha na seção "Fonte
única de regras" — "contratante (RF/MM)" vira "contratante
(Formando/Médico/Revalida)".

## 8. Raio de impacto (arquivos tocados)

| Arquivo | Ação |
|---|---|
| `scripts/acompanhamento_diario/segments.py` | reescrever `classify_contratante`, `classify_segment`, `allocate` |
| `scripts/acompanhamento_diario/sheet.py` | `BLOCK_BASE` novo, chaves nas funções |
| `scripts/acompanhamento_diario/test_segments.py`, `test_sheet.py` | reescrever casos |
| `scripts/planilha_resultados/sheet.py` | `BLOCK_BASE` novo |
| `scripts/planilha_resultados/test_sheet.py` | reescrever casos |
| `scripts/reporte_ka/alloc.py`, `sheet.py` | chaves novas, remove rateio proporcional |
| `scripts/reporte_ka/test_alloc.py`, `test_integration.py` | reescrever casos |
| `.claude/skills/acompanhamento-diario-caveo.md` | referências a `mm`/`rf` → `medico`/`formando` |
| `.claude/skills/planilha-resultados.md` | idem + tags `[RF]`/`[MM]` no texto |
| `.claude/skills/reporte-resultados-ka.md` | idem + fragmentos SOQL apontam pra fundação |
| `.claude/skills/reconciliacao-fechamentos-caveo.md` | idem |
| `.claude/skills/criativos-campeoes.md` | texto da pergunta de escopo |
| `.claude/agents/analista-midia-paga-crm.md` | 1 linha |
| Planilhas reais (via Sheets) | renomear abas/cabeçalhos, seção 6 |

**Fora de escopo:** `.claude/agents/criativos.md` (sub-projeto 4),
`.claude/skills/conversoes-oportunidade.md`,
`scripts/gerar_doc_anuncios.py`/`gerar_doc_google_ads.py` (geradores estáticos
já entregues, fora do pipeline vivo), `lib/`, `components/`, `app/` (dashboard,
sub-projeto 3).

## 9. Testes

Cada arquivo de teste que hoje fixa `"mm"`/`"rf"` literal é reescrito trocando
os valores esperados, sem mudar a forma dos testes:
`test_segments.py` (classificação de opp + campanha + rateio simplificado),
`test_sheet.py` de `acompanhamento_diario` e `planilha_resultados` (offsets de
bloco com as novas chaves), `test_alloc.py`/`test_integration.py` de
`reporte_ka` (chaves novas, sem cálculo de proporção).

Verificação final antes de tocar nas planilhas reais: rodar a suíte
`pytest` de cada módulo, e rodar a skill `acompanhamento-diario-caveo` em modo
preview (sem gravar) num dia recente para confirmar que a classificação nova
bate com o esperado.

## 10. Ressalvas conhecidas

- **Dados históricos não recalculados:** linhas gravadas antes de 2026-07-31
  usaram a classificação antiga (RF por recência) e permanecem como estão —
  append-only. A reconciliação de meses antigos pode mostrar diferença de
  metodologia, não erro de dado.
- **Tags de campanha legadas (`[rf]`/`[mm]`) são um shim temporário:** se o
  cliente eventualmente remover/arquivar todas as campanhas com essas tags,
  esse trecho de `classify_segment` vira código morto — limpeza futura, fora
  de escopo agora.
- **Cabeçalho exato de "Resultados Mês Atual"** (linhas base 45/87) precisa
  ser confirmado ao vivo na planilha antes da renomeação — o texto exato não
  foi verificado neste levantamento (só as linhas via `BLOCK_BASE`).

## 11. Próximos sub-projetos (fora deste spec)

3. **Dashboard** — `lib/types.ts`, `components/top-bar.tsx`,
   `components/opportunities-chart.tsx`, `app/api/*`. Já sabemos exatamente
   onde quebra: `lib/integrations/salesforce.ts` (4 pontos, confirmado via
   `tsc --noEmit` no sub-projeto 1).
4. **Docs estratégicos** — personas, dores/desejos, segmentos de Google Ads,
   testes de LP, pilares de criativo — inclui a reescrita de
   `.claude/agents/criativos.md`, adiada deste sub-projeto.
