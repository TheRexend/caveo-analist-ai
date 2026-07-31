# Design — Fundação de dados: ICP vira Formando/Médico (fim de RF/MM)

> Data: 2026-07-31 · Origem: reunião de estratégia — mudança de ICP da Caveo.
> Sub-projeto 1 de 4 da reformulação de ICP (ver seção 9). Depende de
> `config/business-rules.ts` → `docs/fundacao-dados.md` (mesma Fundação de
> [[2026-07-22-segmentacao-recencia-medico-design.md]], que este spec substitui
> na parte de classificação de contratante).

## 1. Contexto e problema

A visão de ICP (Ideal Customer Profile) da Caveo mudou por completo. Até aqui o
projeto inteiro (regra de negócio, dashboard, skills, agentes, docs
estratégicos) era organizado em torno da dicotomia **RF (Recém-Formado) × MM
(Médico Maduro)** — duas personas com dores, mensagens e campanhas dedicadas,
derivadas de `TipCte__c` (segmento) cruzado com `Tempo_de_Formado__c`
(recência).

A partir de agora, a Caveo enxerga **dois públicos**, sem relação com a
divisão RF/MM:

- **Formando** — ainda cursando faculdade, ainda não é médico.
- **Médico** — já formado (recém ou há tempo), com CRM ou já estabelecido no
  mercado. A recência (menos ou mais de 3 anos) é uma característica **dentro**
  de Médico, não mais um divisor estratégico com mensagem própria.

**Mídia paga passa a mirar 100% em "Médico".** Não existe mais orçamento
institucional dividido entre dois segmentos concorrentes — logo o mecanismo de
rateio de campanha por tag `[RF]`/`[MM]` deixa de fazer sentido daqui pra
frente. Um Formando que ainda assim converta via mídia paga continua sendo um
lead legítimo no funil (não é tratado como ruído/fora do ICP), só que como
segmento secundário, sem campanha dedicada.

`Revalida` (médico formado no exterior, revalidando diploma) permanece uma
categoria à parte — não é fundido em "Médico" nem em "Formando".

### Por que isso é uma mudança de fundação, não só de nomenclatura

A regra atual (`CONTRATANTE_RULES`/`classifyContratante`) usa recência para
**decidir** se um `Médico` é RF ou MM — é uma classificação de duas etapas
(segmento, depois recência). Na regra nova, a classificação é **direta em
`TipCte__c`**, sem segunda etapa: recência deixa de ter qualquer papel na
lógica de segmentação. Isso simplifica o builder SOQL e a função classificadora
— e obriga a repensar o rateio de mídia paga, que só existia por causa da
disputa de orçamento entre dois públicos.

## 2. Regra nova (decisões fechadas com o usuário)

| Condição | Bucket |
|---|---|
| `TipCte__c = 'Formando'` | **formando** |
| `TipCte__c = 'Médico'` (qualquer recência, incl. null) | **medico** |
| `TipCte__c = 'Revalida'` | **revalida** |
| `TipCte__c = null`/desconhecido | fora de segmentação (só em `all`, inalterado) |

Decisões de borda confirmadas:

- **Recência (`Tempo_de_Formado__c`) sai da lógica de classificação.** Continua
  existindo como campo/atributo informativo — pode ser consultado pontualmente
  dentro de "medico" (ex.: "quantos médicos <3 anos fecharam este mês"), mas
  nenhuma regra/relatório o trata como divisor por padrão daqui em diante.
- **Revalida ganha chave própria** (`"revalida"`), em vez de ser absorvido por
  "medico" como acontecia com MM antes.
- **Formando em mídia paga é segmento secundário válido**, não ruído/fora do
  ICP — só não é mais o alvo de campanha dedicada.
- **Rateio de campanha institucional (`SEGMENT_ALLOCATION`, tags `[RF]`/`[MM]`)
  é retirado da Fundação.** Como 100% do investimento em mídia paga mira
  Médico, não há mais dois segmentos disputando o mesmo orçamento
  institucional — o mecanismo de rateio 50/50 deixa de ter propósito daqui pra
  frente. Como interpretar dados **históricos** de meses em que o rateio ainda
  valia é uma decisão do sub-projeto 2 (skills), fora do escopo desta Fundação.

## 3. Abordagem escolhida

**Classificação direta de um único campo (Abordagem A)** — sem a segunda etapa
de recência que existia na regra RF/MM. `classifyContratante` perde o
parâmetro `recencia`; vira uma função de um argumento só.

Alternativa descartada:

- **B — manter recência como parâmetro "for future use":** violaria YAGNI.
  Nenhum consumidor atual precisa de recência na classificação; se algum
  relatório futuro quiser cruzar médico × recência, ele consulta
  `Tempo_de_Formado__c` diretamente (já documentado no catálogo), sem precisar
  de um parâmetro morto na função classificadora.

## 4. Modelo de dados na Fundação (`config/business-rules.ts`)

`CONTRATANTE_RULES` passa de segmento+recência para uma lista simples de
segmentos:

```ts
export type ContratanteKey = "all" | "formando" | "medico" | "revalida";

export const CONTRATANTE_RULES = {
  recencyField: "Tempo_de_Formado__c", // atributo informativo — não classifica
  segments: ["Formando", "Médico", "Revalida"] as const,
} as const;
```

Função classificadora, agora sem recência:

```ts
export function classifyContratante(
  tipCte: string | null,
): "formando" | "medico" | "revalida" | null {
  if (tipCte === "Formando") return "formando";
  if (tipCte === "Médico") return "medico";
  if (tipCte === "Revalida") return "revalida";
  return null; // TipCte null/desconhecido → fora de segmentação
}
```

`tipcteFilter(c: ContratanteKey)` simplificado — filtro direto, sem cláusula
composta:

```sql
-- formando
AND TipCte__c IN ('Formando')

-- medico
AND TipCte__c IN ('Médico')

-- revalida
AND TipCte__c IN ('Revalida')

-- all (inalterado)
AND TipCte__c IN ('Formando','Médico','Revalida')
```

`SEGMENT_ALLOCATION` (seção 8 atual da Fundação) é **removida** do arquivo.
`docs/fundacao-dados.md` passa a trazer, no lugar, uma nota histórica curta
explicando que o rateio institucional RF/MM existiu até a virada de ICP
(2026-07-31) e não se aplica a campanhas novas.

## 5. Raio de impacto (só desta Fundação)

| Arquivo | Ação |
|---|---|
| `config/business-rules.ts` | reescrever `CONTRATANTE_RULES`, `classifyContratante`, `tipcteFilter`; remover `SEGMENT_ALLOCATION` |
| `config/business-rules.test.ts` | reescrever casos: Formando→formando, Médico→medico (com e sem recência), Revalida→revalida, null/"Outro"→null; `tipcteFilter` para os 4 buckets |
| `config/generate-docs.ts` | ajustar template da seção 4 (classificação direta) e remover/substituir a seção 8 (alocação) |
| `docs/fundacao-dados.md` | **regenerar** via `npm run docs:rules`; `npm run docs:check` verde |
| `docs/data-catalog.md` | nota de `Tempo_de_Formado__c`: de "compõe RF/MM" para "atributo informativo dentro de Médico, não usado na classificação" |

**Fora de escopo deste spec** (vira spec próprio depois, ver seção 9):
`lib/types.ts` e o resto do dashboard (`Contratante`, componentes, rotas de
API), as skills operacionais que hoje geram blocos/abas RF/MM
(`planilha-resultados`, `reporte-resultados-ka`, `acompanhamento-diario-caveo`,
`reconciliacao-fechamentos-caveo`, `criativos-campeoes`), os scripts Python que
espelham a regra (`scripts/*/segments.py`, `scripts/*/alloc.py`,
`scripts/*/blocks.py`), os agentes (`analista-midia-paga-crm`, `criativos`), e
os docs estratégicos de persona/dores-desejos/segmentos/LP que hoje tratam
RF/MM como públicos distintos.

## 6. Rollout & verificação

1. Alterar a Fundação (`business-rules.ts`); rodar `npm run docs:rules`;
   garantir `npm run docs:check` verde.
2. Rodar os testes de `business-rules.test.ts` (novos casos).
3. `tsc`/build do dashboard: esperado **quebrar** neste ponto, porque
   `lib/types.ts` e os consumidores ainda importam `ContratanteKey = "rf"|"mm"`
   e `SEGMENT_ALLOCATION`. Isso é esperado e fica documentado como a ponte para
   o sub-projeto 2 — não se corrige aqui, só se confirma que a quebra é
   exatamente nesses pontos (nenhuma surpresa).
4. Teste de fumaça SOQL: `tipcteFilter("medico")`/`("formando")`/`("revalida")`
   contra o Salesforce real, conferindo contagens plausíveis por bucket.

## 7. Testes

Unitário de `classifyContratante`: Formando→formando (com/sem recência,
recência agora é ignorada), Médico→medico (com/sem recência, mesmo
resultado), Revalida→revalida, null/"Outro"→null. Unitário de `tipcteFilter`
para os 4 buckets (`formando`, `medico`, `revalida`, `all`). `docs:check`
verde como guarda de sincronia.

## 8. Ressalvas conhecidas

- **Quebra intencional e temporária:** este sub-projeto deixa o dashboard e as
  skills sem compilar/funcionar até os sub-projetos 2 e 3 serem implementados
  (ver seção 9). É uma decisão consciente para não misturar a mudança de regra
  com a migração de todos os consumidores num commit só.
- **Dados históricos de rateio institucional:** meses já fechados que usaram
  tags `[RF]`/`[MM]` e rateio 50/50 não são recalculados por esta Fundação —
  quem decide como tratá-los é o sub-projeto 2, olhando cada skill.
- **Revalida é baixo volume** (9 casos em 120 dias, conforme levantamento de
  22/07/2026) — ganhar chave própria é mais sobre corretude conceitual do que
  volume relevante hoje.

## 9. Próximos sub-projetos (fora deste spec)

Ordem acordada com o usuário:

1. **Fundação de dados** — este spec.
2. **Camada agêntica (skills/agentes)** — `planilha-resultados`,
   `reporte-resultados-ka`, `acompanhamento-diario-caveo`,
   `reconciliacao-fechamentos-caveo`, `criativos-campeoes`,
   `analista-midia-paga-crm`, `criativos` — todos hoje operam com RF/MM como
   as duas chaves de segmentação (abas de planilha, benchmarks, rateio de tag
   de campanha). Precisa decidir também o tratamento de dados históricos
   (rateio pré-virada).
3. **Dashboard** — `lib/types.ts`, `components/top-bar.tsx`,
   `components/opportunities-chart.tsx`, rotas `app/api/*`.
4. **Docs estratégicos** — `personas_recem_formados.md` vs
   `personas_medico_maduro.md`, `Dores_Desejos_Publicos_Caveo.md`,
   `Google_Ads_Segmentos_Caveo.md`, testes de LP, pilares de criativo — hoje
   tratam RF e MM como públicos com dores/mensagens diferentes; precisam virar
   uma persona "Médico" unificada (com Formando à parte).

Pós-implementação deste sub-projeto, o guardião de organização (a própria raiz,
por `CLAUDE.md`):

- roda `npm run docs:check` e confirma a sincronia da Fundação;
- atualiza `docs/projeto-mapa.md` sinalizando a Fundação como fase de transição
  (RF/MM → Formando/Médico/Revalida em andamento);
- registra na memória a virada de ICP e a ordem dos sub-projetos restantes.
