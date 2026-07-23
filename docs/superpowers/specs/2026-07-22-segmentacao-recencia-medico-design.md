# Design — Segmentação RF/MM por recência (novo modelo do cliente)

> Data: 2026-07-22 · Origem: reunião com o cliente (doc "Mudança na
> segmentação de médicos no Salesforce", 21/07/2026).
> Depende da Fundação (`config/business-rules.ts` → `docs/fundacao-dados.md`).

## 1. Contexto e problema

O cliente reformulou como "médico maduro" vs "médico recém-formado" é
representado no Salesforce. O campo **`TipCte__c` (Tipo de contratante)** deixou
de misturar segmento + recência + canal. Agora:

- **Segmento** (`TipCte__c`): `Formando` · `Médico` · `Revalida`.
- **Recência** (`Tempo_de_Formado__c`): `Vai se formar` · `Menos de 3 anos` ·
  `Mais de 3 anos`.
- **Canal** (faculdades × direto): derivado da origem — fase 2 do cliente, fora
  deste escopo.

Os valores antigos `Médico Faculdades` e `Médicos Maduros` **não existem mais** —
ambos viraram `Médico`.

### Estado real verificado no Salesforce (produção CAVEO TECHNOLOGY, 2026-07-22)

Distribuição de `TipCte__c` (opps criadas nos últimos 120 dias):

| `TipCte__c` | qtd |
|---|---|
| `Formando` | 6.549 |
| `null` | 2.276 |
| `Médico` | 2.254 |
| `Revalida` | 9 |

Cruzamento `TipCte__c` × `Tempo_de_Formado__c` (120 dias):

| Segmento | Recência | qtd |
|---|---|---|
| `Médico` | `Mais de 3 anos` | 1.238 |
| `Médico` | `Menos de 3 anos` | 1.001 |
| `Médico` | `null` | 15 |
| `Formando` | `Vai se formar` | 293 |
| `Formando` | `null` | 6.257 |
| `Revalida` | `null` | 9 |
| `null` | `null` | 2.276 |

Observações que sustentam o design:

- **Cobertura de recência dos médicos ≈ 99,3%** (só 15 nulls). O split
  recém/maduro é confiável onde há médico.
- **`Formando` é RF por definição** — só 4,5% têm recência preenchida, mas o
  próprio segmento já carrega a informação; a recência é redundante ali.
- Recência dos médicos existe de **~mar/2026 em diante** (antes disso eram os
  rótulos antigos). `MesFor__c` = "Já é formado" em 100% dos médicos — **não**
  serve de proxy de recência. Canal (`LeadSource`) é ruidoso (médicos vêm de LP
  Turbo, LP MM e cauda longa) — canal ≠ recência, como o cliente pontuou.

### Por que é urgente

A regra atual da Fundação (`CONTRATANTE_RULES`) **já está quebrada em produção**:

- `rf: ["Formando", "Médico Faculdades"]` → `Médico Faculdades` casa com **zero**
  linhas. RF hoje = só `Formando`.
- `mm: ["Médico", "Revalida"]` → `Médico` captura **todos** os médicos. MM está
  engolindo os médicos recém-formados que deveriam ser RF.

Ou seja, dashboard e skill de acompanhamento diário mostram RF/MM errado desde a
virada do cliente. Corrigir restabelece a visualização recém-formado × maduro no
formato novo.

### Pré-condição operacional (Field-Level Security)

`Tempo_de_Formado__c` foi criado em 21/07 e nasceu **sem FLS** para o usuário de
integração do MCP Salesforce — as queries retornavam `INVALID_FIELD`. O cliente
liberou *Read* do campo para o perfil da integração em 2026-07-22, e a leitura
passou a funcionar. **A implementação depende desse acesso continuar liberado.**

## 2. Regra nova (decisões fechadas)

| Condição | Bucket |
|---|---|
| `TipCte__c = 'Formando'` (qualquer recência, incl. null) | **RF** |
| `TipCte__c = 'Médico'` **e** recência ∈ {`Menos de 3 anos`, `Vai se formar`} | **RF** |
| `TipCte__c = 'Médico'` **e** recência ∉ {acima} (inclui `Mais de 3 anos` e **null**) | **MM** |
| `TipCte__c = 'Revalida'` | **MM** |
| `TipCte__c = null` | fora de RF/MM (inalterado) |

Decisões de borda (confirmadas com o usuário):

- **Médico sem recência (null) → MM** (fallback conservador; ~0,7% recente, mais
  no histórico anterior ao backfill).
- **Revalida → MM** (mantém o comportamento atual do projeto).
- `Médico` + `Vai se formar` é mapeado para RF por robustez, embora hoje nenhum
  médico tenha esse valor.

## 3. Abordagem escolhida

**Encapsular a regra composta no builder da Fundação + função classificadora
pura testável (Abordagem A).** A lógica de segmento vive só na Fundação; os
consumidores herdam.

Alternativas descartadas:

- **B — espelho Python do classificador em `segments.py`:** duas implementações
  da mesma regra para sincronizar. YAGNI para 3 valores. `segments.py` classifica
  **campanha** por tag `[MM]`/`[RF]` (não opp por `TipCte__c`) e permanece
  intocado.
- **C — patch nas listas chapadas:** inviável. `Médico` pertence a RF **e** MM
  conforme a recência; uma lista `TipCte__c IN (...)` não expressa o split.

## 4. Modelo de dados na Fundação (`config/business-rules.ts`)

`CONTRATANTE_RULES` passa de duas listas chapadas para um formato composto:

```ts
export const CONTRATANTE_RULES = {
  recencyField: "Tempo_de_Formado__c",
  rfSegments: ["Formando"],          // segmento já define RF
  mmSegments: ["Revalida"],          // segmento já define MM
  splitSegment: "Médico",            // dividido pela recência
  rfRecencyValues: ["Menos de 3 anos", "Vai se formar"],
  allSegments: ["Formando", "Médico", "Revalida"],
} as const;
```

`tipcteFilter(c)` reescrito para emitir a cláusula composta (com o `AND ` inicial
para concatenar ao WHERE). Formas validadas contra o Salesforce:

```sql
-- rf
AND (TipCte__c = 'Formando'
     OR (TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')))

-- mm
AND (TipCte__c = 'Revalida'
     OR (TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))))

-- all (conceitualmente inalterado)
AND TipCte__c IN ('Formando','Médico','Revalida')
```

> **Semântica de null confirmada no SF:** `NOT Tempo_de_Formado__c IN (...)`
> **inclui** as linhas com recência null — por isso médico-null cai em MM sem
> cláusula extra. Reconciliação (120 dias): RF-médico = 1.001; MM-médico =
> 1.238 (`Mais de 3 anos`) + 15 (null) = 1.253. Ambas conferidas via `COUNT`.

Função classificadora pura, fonte única para lógica fora do SOQL (skills, testes):

```ts
export function classifyContratante(
  tipCte: string | null,
  recencia: string | null,
): "rf" | "mm" | null {
  if (tipCte === "Formando") return "rf";
  if (tipCte === "Revalida") return "mm";
  if (tipCte === "Médico") {
    return recencia && CONTRATANTE_RULES.rfRecencyValues.includes(recencia)
      ? "rf"
      : "mm"; // Mais de 3 anos, null, ou valor inesperado → MM
  }
  return null; // TipCte null/desconhecido → fora de RF/MM
}
```

## 5. Raio de impacto

| Arquivo | Ação |
|---|---|
| `config/business-rules.ts` | reescrever `CONTRATANTE_RULES` + `tipcteFilter()`; adicionar `classifyContratante()` |
| `config/generate-docs.ts` | renderizar seção 4 no formato composto; remover a nota "correção Médico→MM" |
| `docs/fundacao-dados.md` | **regenerar** (`npm run docs:rules`); `docs:check` verde |
| `.claude/skills/acompanhamento-diario-caveo.md` | incluir `Tempo_de_Formado__c` nos SOQL **1C / 1D / 1E**; trocar "segment por `TipCte__c`" pela regra composta (referência a `classifyContratante`) |
| `docs/data-catalog.md` | registrar `Tempo_de_Formado__c` (picklist, usado); nota que `MesFor__c` não é recência |
| `lib/types.ts` | atualizar comentários de doc de `rf`/`mm` |
| `lib/integrations/salesforce.ts` | **sem mudança** (consome `tipcteFilter()`); só validar `tsc`/build |
| `components/top-bar.tsx`, `components/opportunities-chart.tsx` | **sem mudança** (rótulos seguem RF/MM) |
| `.claude/skills/reporte-coorte.md`, `reporte-consolidado-mensal.md`, agentes | **sem mudança** (deferem à Fundação; não hardcodam valores) |

### Detalhe da skill diária

Os três SOQL que hoje selecionam `TipCte__c` passam a selecionar também
`Opportunity.Tempo_de_Formado__c` (1C, via `OpportunityHistory`) /
`Tempo_de_Formado__c` (1D, 1E). Ao montar `SF_HISTORY`, `SF_CLOSINGS` e
`SF_CAMP_OPPS`, o segmento (`mm`/`rf`) é resolvido por `classifyContratante`
(TipCte + recência), não mais só por `TipCte__c`. As estruturas Python e o
`sheet.py`/`qualification.py` não mudam — continuam recebendo `segment` já
resolvido.

## 6. Rollout & verificação

1. Alterar a Fundação; rodar `npm run docs:rules`; garantir `npm run docs:check`
   verde.
2. `tsc` / build do dashboard verdes (nenhuma mudança em `salesforce.ts`, mas o
   builder mudou de forma — validar que compila e roda).
3. Teste de fumaça SOQL: reconciliar RF-médico = 1.001 e MM-médico = 1.253 (120d).
4. Skill diária: rodar em modo preview (sem gravar) num dia recente e conferir que
   médicos recém-formados aparecem em RF (antes iam para MM).
5. **Append-only preservado:** a regra vale dos próximos dias em diante; dias já
   gravados na planilha "Resultados Mês Atual" **não** são reescritos.

## 7. Testes

Teste unitário de `classifyContratante()` cobrindo os 5 casos da tabela da
seção 2: Formando→rf, Médico+Menos de 3→rf, Médico+Mais de 3→mm, Médico+null→mm,
Revalida→mm (e null→null). Se não houver runner TS no projeto, a garantia mínima
é `docs:check` + a reconciliação SOQL da seção 6.

## 8. Ressalvas conhecidas

- **Histórico:** recência de médicos cobre ~mar/2026 em diante. Períodos
  anteriores e médico-null caem em MM por fallback — coerente com a decisão, mas
  significa que RF histórico de médico pode estar subestimado onde o backfill não
  chegou.
- **Dependência de FLS:** se o acesso ao campo for revogado, as queries voltam a
  falhar com `INVALID_FIELD`. Documentado no catálogo.
- **Canal (fase 2 do cliente):** quando a Caveo formalizar "faculdades × direto"
  derivado da origem, pode virar uma dimensão nova — fora deste escopo.

## 9. Tarefas de organização (orquestrador / sessão raiz)

Pós-implementação, o guardião de organização (a própria raiz, por `CLAUDE.md`):

- roda `npm run docs:check` e confirma a sincronia da Fundação;
- atualiza `docs/projeto-mapa.md` se necessário;
- sinaliza skills/agentes que referenciam a regra de contratante;
- registra na memória a nova regra de segmentação e a lição do FLS.
