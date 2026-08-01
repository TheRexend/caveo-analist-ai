# Reconciliação de Fechamentos MM/RF (planilha vs. Salesforce) — Design

> Corrige a causa raiz de uma divergência de contagem entre a skill
> `acompanhamento-diario-caveo` (planilha "Resultados Mês Atual") e o dashboard
> Vercel, e cria uma skill nova para auditar essa divergência sob demanda, sem
> alterar o comportamento append-only já validado da skill diária.
> Data: 2026-07-28. Nome de trabalho da skill nova: `reconciliacao-fechamentos-caveo`.

## Contexto e problema

O usuário reportou: planilha "657 fechamentos" (24 MM + 43 RF) vs. dashboard
"61 fechamentos" (40 RF + 21 MM), pedindo auditoria para as duas fontes baterem.

Auditoria (2026-07-28) apurou dois achados distintos:

1. **"657" não existe na planilha.** O bloco TOTAL da aba "Resultados Mês
   Atual" (linha 36, coluna O) soma **67**, exatamente 24 (MM) + 43 (RF). A aba
   "Banco de Dados" é scaffold morto (já documentado como órfão no design da
   `acompanhamento-diario-caveo`) e não é fonte de nada. O número real da
   planilha é **67**, não 657 — provável erro de digitação/leitura do usuário,
   sem impacto na causa raiz abaixo.
2. **67 (planilha) vs. 61 (dashboard) é uma divergência real.** Reproduzindo a
   query exata do dashboard (mesmo filtro cpc+cruzamento, mesma `WON_CLAUSE`,
   mesmo período 01–27/07) direto no Salesforce, agrupado por `TipCte__c`:
   Formando=5, Médico=56, total=**61** — bate exatamente com o dashboard. A
   planilha tem **6 fechamentos a mais** (3 MM + 3 RF) que não existem mais
   nessa forma no Salesforce hoje.

### Causa raiz confirmada

- A Fase 1D da skill diária (fechamentos) **não filtra por `TipCte__c` no
  SOQL** — traz todos os Ganho do período e classifica **inline, de memória**,
  porque **não existe `classifyContratante` em Python** hoje
  (`scripts/acompanhamento_diario/segments.py` só tem `classify_segment`/
  `allocate`, para rateio de campanha — nada equivalente a
  `CONTRATANTE_RULES`/`classifyContratante` de `config/business-rules.ts`). Sem
  função testada e compartilhada, cada execução diária depende de quem rodou a
  skill aplicar a regra corretamente de cabeça.
- A planilha é um **livro-razão append-only** (nunca reescreve dias
  passados), enquanto o dashboard **sempre recalcula do estado atual** do
  Salesforce. Se um registro mudar depois de gravado (`TipCte__c` corrigido,
  oportunidade reaberta, estágio ajustado de/para "Ganho não Identificado" —
  qualquer mudança que atualize `LastStageChangeDate`), o Salesforce deixa de
  refletir o que a planilha gravou naquele dia — e a planilha não tem como
  saber, porque nunca revisita dias já gravados.
- A planilha só grava contagem agregada por dia/segmento, **sem ID de
  oportunidade** — não há como, com os dados existentes, apontar retroativamente
  *quais* 6 oportunidades específicas causaram a diferença já ocorrida.

### Decisão de produto (confirmada com o usuário)

- A planilha **continua imutável** (append-only, sem retroativo) — não vamos
  reescrever histórico nem mudar a cadência da skill diária.
- Criamos uma **reconciliação à parte**, sob demanda, que compara o ledger
  contra o Salesforce atual e aponta divergência — sem tentar fazer as duas
  fontes "baterem" automaticamente.
- Escopo desta rodada é **só fechamento**. MQL/SQL têm o mesmo risco estrutural
  (classificação sem função testada), mas ficam para uma iteração futura caso o
  mesmo padrão de divergência apareça lá.

## Não-objetivos (escopo)

- Não reescreve nem recomputa dias já gravados na planilha "Resultados Mês
  Atual" — o modelo append-only da `acompanhamento-diario-caveo` continua como
  está.
- Não cobre MQL/SQL nem investimento/leads — só a métrica de fechamento (coluna
  O), que foi o caso concreto reportado.
- Não resolve retroativamente as 6 oportunidades já divergentes deste mês —
  a nova skill mostra o estado atual do Salesforce para o dia sinalizado (apoio
  a investigação manual), não um diff de IDs (a planilha nunca guardou IDs).
- Não altera `config/business-rules.ts` nem `docs/fundacao-dados.md` — a regra
  de classificação já está correta e completa lá; falta só a implementação
  Python que a espelhe (mesmo padrão já usado por `segments.py`/`qualification.py`).
- Não mexe na divergência de rateio institucional (dupla contagem no dashboard
  vs. rateio proporcional na skill diária) já registrada como "fora de escopo"
  no design da `acompanhamento-diario-caveo` — é outra métrica (investimento/leads),
  não fechamento.

## Parte 1 — `classify_contratante` testado (estanca nova divergência)

Adicionar a `scripts/acompanhamento_diario/segments.py`:

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

Testes em `test_segments.py` espelhando `config/business-rules.test.ts`:
Formando (qualquer recência) → rf; Médico + cada valor de recência (incl.
`None`) → rf/mm conforme a tabela; Revalida → mm; `TipCte__c` nulo/desconhecido
→ `None`.

Atualizar `.claude/skills/acompanhamento-diario-caveo.md` (Fases 1C, 1D, 1E):
trocar a instrução em prosa ("segment por `classifyContratante(...)`") por uma
instrução explícita de importar e chamar `classify_contratante` (mesmo padrão
já usado para `classify_segment`/`allocate`) ao montar `SF_HISTORY`,
`SF_CLOSINGS` e `SF_CAMP_OPPS` — a classificação deixa de ser "de memória" e
passa a ser a função testada, para todo run futuro da skill.

Isso **não** corrige os 6 fechamentos já divergentes (são passado congelado),
só garante que a partir de agora a classificação de fechamento use a mesma
regra testada que o dashboard.

## Parte 2 — Skill `reconciliacao-fechamentos-caveo` (reconciliação sob demanda)

Skill nova, só leitura (nunca escreve na planilha nem no Salesforce), que
compara o ledger da planilha contra o Salesforce atual, dia a dia e segmento a
segmento, e aponta onde e quando a divergência nasceu.

### Reaproveitamento (sem pasta nova)

Estende os módulos já existentes em `scripts/acompanhamento_diario/` em vez de
duplicar lógica:

- `segments.py` → usa `classify_contratante` (Parte 1).
- `sheet.py` → ganha uma leitura simétrica à escrita existente
  (`cell_updates`/`write_updates` escrevem; falta ler):

  ```python
  def read_fechamentos(worksheet):
      """{'mm': {dia: valor_ou_None}, 'rf': {...}} a partir da coluna O dos blocos."""
  ```

  Célula vazia → `None` (dia não processado, fora da comparação). Célula com
  número (mesmo `0`) → entra na comparação. Testado em `test_sheet.py`.

### Fluxo (fases, no mesmo estilo da skill diária)

1. **Período** — padrão: dia 1 do mês corrente até o último dia com valor
   gravado (não vazio) na coluna O de qualquer um dos blocos MM/RF (os dois
   blocos são sempre gravados juntos, então o último dia coincide). Aceita
   override de intervalo via `$ARGUMENTS`, para reconciliar um mês fechado.
2. **Ler planilha** — `read_fechamentos()` → contagem gravada por dia/segmento.
3. **Consultar Salesforce agora** — **uma query agregada** para o período
   inteiro (não uma por dia, mesmo princípio de "uma passada agregada" da skill
   diária):

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

   Em Python, agrega cada linha por dia/segmento via `classify_contratante`
   (linhas com segmento `None` são descartadas, mesma regra da Fase 1D).
4. **Comparar** — ledger vs. Salesforce-agora, dia × segmento. Igual → ok.
   Diferente → sinaliza.
5. **Drill-down nos dias divergentes** — para cada combinação dia/segmento
   sinalizada, uma query pontual (só aquele dia, sem filtro de `TipCte__c`):

   ```sql
   SELECT Id, Name, Account.Name, StageName, LastStageChangeDate,
          TipCte__c, Tempo_de_Formado__c
   FROM Opportunity
   WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
     AND LastStageChangeDate >= [DIA]T00:00:00-03:00
     AND LastStageChangeDate <= [DIA]T23:59:59-03:00
     AND ([FILTRO_META] OR [FILTRO_GOOGLE])
   ```

   Classifica cada resultado com `classify_contratante` e filtra para o
   segmento sinalizado, listando para conferência manual. **Limitação
   explícita:** isso mostra a verdade *atual* do Salesforce para aquele dia —
   não um diff de IDs contra o que a planilha gravou (ela nunca guardou IDs).
6. **Resumo final** — tabela dia × segmento × ledger × Salesforce-agora × diff,
   mais o total do período (ledger vs. Salesforce-agora), no mesmo formato da
   auditoria manual feita nesta sessão.

### Artefatos e organização

- **Skill:** `.claude/skills/reconciliacao-fechamentos-caveo.md`
- **Comando:** `.claude/commands/reconciliacao-fechamentos-caveo.md` (invólucro
  fino, mesmo padrão das demais skills do projeto)
- **Helpers estendidos:** `scripts/acompanhamento_diario/segments.py` (+
  `classify_contratante`), `scripts/acompanhamento_diario/sheet.py` (+
  `read_fechamentos`), com testes em `test_segments.py`/`test_sheet.py`.
- **Índice:** atualizar `docs/projeto-mapa.md` (skill nova na seção de skills,
  nota sobre `classify_contratante` como função compartilhada).

## Casos de borda

- Dia com célula `0` na planilha (processado, sem fechamento) vs. Salesforce
  agora mostrando >0 para o mesmo dia/segmento → diverge normalmente (conta
  como sinalizado, não como "vazio").
- Mês corrente sem nenhum dia gravado ainda → relatório informa "nada a
  reconciliar" em vez de comparar contra zero.
- Oportunidade que hoje classifica como `None` (`TipCte__c` vazio/desconhecido)
  mas que a planilha, num run passado, pode ter classificado em MM/RF por erro
  de classificação de memória → aparece como parte do delta no total, mas não
  entra em nenhuma lista de drill-down por segmento (fica só no total
  Salesforce-agora vs. ledger, sem bucket).
- Override de mês fechado (não o corrente) → mesma mecânica, só muda START/END;
  a aba "Resultados Mês Atual" só tem o mês corrente, então reconciliar mês
  passado exige apontar para outra aba/planilha arquivada (fora de escopo desta
  spec — assume-se uso apenas no mês corrente por ora).

## Notas ao guardião (anti-duplicação / divergências)

- Esta spec **corrige** a lacuna de anti-duplicação identificada: a regra de
  `CONTRATANTE_RULES` já vivia só em TypeScript; a partir desta mudança, a
  camada agêntica (Python) também consome uma implementação testada, no mesmo
  padrão que `segments.py`/`qualification.py` já usam para as demais regras
  (comentário `"Espelha ... (fonte de verdade: config/business-rules.ts)"`).
- Não confundir com a divergência de **rateio institucional** já registrada no
  design da `acompanhamento-diario-caveo` ("Notas ao guardião" — dashboard conta
  institucional cheio nos dois segmentos, skill diária rateia proporcional).
  Aquela é sobre investimento/leads; esta spec é sobre fechamento. São
  problemas e correções independentes.
- MQL/SQL herdam o mesmo risco estrutural (classificação sem função testada) —
  ao consumir esta spec, sinalizar que uma extensão natural é aplicar o mesmo
  padrão (`classify_contratante` importado, não descrito em prosa) lá também,
  numa iteração futura.

## Suposições a confirmar na revisão

- Nome da skill `reconciliacao-fechamentos-caveo` (ajustável).
- Reconciliação cobre por padrão o mês corrente inteiro (dia 1 até o último dia
  gravado), não um único dia — confirmar que é o uso esperado (auditoria
  ocasional, não checagem diária).
- A skill é só leitura/relatório no chat — não grava em nenhuma planilha nem
  aba nova. Confirmado com o usuário (opção "skill sob demanda").
