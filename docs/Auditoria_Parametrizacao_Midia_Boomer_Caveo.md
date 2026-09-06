# Auditoria — Parametrização de Mídia (macro ADS) — Caveo

> **Objeto auditado:** planilha `Caveo - Parametrização Boomer - Mídia (macro ADS).csv`,
> 2.308 oportunidades criadas entre 01/06/2026 e 24/08/2026, todas com
> `Macro origem (atual) = ADS`, classificadas pelo time interno entre
> MÍDIA PAGA (1.900) e ORGÂNICO (408).
> **Fontes de contraprova:** Salesforce (campos `gclid__c`, `gbraid__c`,
> `wbraid__c`, `fbclid__c`, `fbc__c`, `fbp__c`, `UtmMed__c`, `UrlUtm__c`),
> Meta Ads (`act_438086148409254`) e Google Ads (`3921127876`).
> **Recorte temporal:** 01/06 a 24/08/2026, sempre em BRT (`-03:00`).
> **Data da auditoria:** 2026-08-24.

---

## Veredicto em uma linha

**A classificação está correta e é reproduzível** — reconstruí a regra do zero e
cheguei exatamente nas mesmas 1.900 oportunidades, sem uma única divergência.
Mas há **três correções a fazer**, e uma delas é séria: a coluna `Sinal Meta?`
não mede contato com anúncio.

---

## 1. O universo da planilha confere

A planilha cobre exatamente as oportunidades com `LeadSource` em LP MM,
LP Turbo e Site — que é o que o Salesforce marca como macro ADS.

| Mês | Planilha | Salesforce | Status |
|---|---:|---:|---|
| 2026-06 | 410 | 410 | confere |
| 2026-07 | 497 | 497 | confere |
| 2026-08 (1–24) | 1.401 | 1.402 | −1 registro |
| **Total** | **2.308** | **2.309** | **99,96%** |

O registro faltante é de agosto, quase certamente criado depois do export.
Irrelevante para qualquer conclusão.

### Mas o recorte é estreito demais

A planilha só olhou o que **já estava** na macro ADS. O Salesforce tem, no mesmo
período, **14 oportunidades com click ID real do Google fora desse recorte**:

| LeadSource | Opps com gclid/gbraid/wbraid |
|---|---:|
| Masterclass | 5 |
| WhatsApp Aulão | 3 |
| Masterclass Revalida | 1 |
| MGM Justino / Bruno / Flavia / João / Rodrigo | 1 cada |

São leads que clicaram num anúncio do Google e hoje estão contabilizados como
Masterclass, WhatsApp ou indicação. Como o levantamento partiu de `macro = ADS`,
eles nunca entraram na fila de auditoria. Há ainda 22 oportunidades fora do
recorte com `UtmMed__c` preenchido.

---

## 2. A lógica de classificação está correta

Reconstruí a regra sem olhar a coluna `CLASSIFICAÇÃO` e comparei:

```
(utm_medium na família cpc)  ∪  (Click ID do Google presente)  =  1.900
                                     MÍDIA PAGA (planilha)  =  1.900
                                            divergências    =  0
```

Zero divergências em 2.308 linhas. A regra é determinística e qualquer pessoa
com acesso ao Salesforce reproduz o mesmo número.

### A regra do click ID foi validada registro a registro

16 linhas estão marcadas com `Click ID Google? = Sim` mas mostram uma URL de
origem limpa (`https://lp.caveo.com.br/`). Fui ao Salesforce conferir uma a uma:
**15 têm `gclid__c` ou `gbraid__c` real gravado no registro.** São exatamente os
casos que a equipe queria pegar — o UTM diz "Indicação", "ADIREL", "Instagram"
ou um número de telefone, mas o click ID entrega que veio de anúncio.

A única exceção é **OP-057598**: não tem click ID nenhum no Salesforce. Continua
corretamente classificada como paga (tem `utm_medium=cpc`), mas o motivo
registrado está errado.

---

## 3. Quanto o click ID acrescenta sobre o `cpc` — a resposta direta

Esta é a pergunta central do levantamento. O número:

| Critério | Jun | Jul | Ago | Total |
|---|---:|---:|---:|---:|
| Só `utm_medium` família cpc | 272 | 335 | 1.276 | 1.883 |
| Só Click ID do Google | 133 | 168 | 959 | 1.260 |
| **União (= classificação final)** | **278** | **338** | **1.284** | **1.900** |
| **Ganho exclusivo do click ID** | **6** | **3** | **8** | **17** |

**17 oportunidades** só aparecem como mídia paga por causa do click ID. Em
volume é pouco: 0,9% do total pago. **Em valor é outra história — 4 delas são
fechamentos:**

| Oportunidade | Mês | utm_source | O que parecia | O que é |
|---|---|---|---|---|
| OP-051740 | 2026-06 | `Indicação` | indicação | Google Ads (gclid + gbraid) |
| OP-051748 | 2026-06 | `Indicação` | indicação | Google Ads (gclid + gbraid) |
| OP-053039 | 2026-07 | `Amigos` | boca a boca | Google Ads |
| OP-055997 | 2026-08 | *(vazio)* | sem origem | Google Ads (gclid + gbraid) |

São 4 dos 129 fechamentos pagos do período — **3,1% da receita atribuída à mídia
paga só existe porque alguém olhou o click ID**. Sem essa regra, esses quatro
contratos seriam creditados a indicação ou a lugar nenhum.

---

## 4. ⚠ A coluna `Sinal Meta?` está medindo a coisa errada

**Este é o achado mais importante da auditoria.**

A planilha marca 659 linhas com `Sinal Meta? = Sim`. Reproduzi o número no
Salesforce e ele bate exatamente:

```
fbclid__c ≠ nulo  OU  fbc__c ≠ nulo  OU  fbp__c ≠ nulo   =  660
                          Sinal Meta? = Sim (planilha)   =  659   (a diferença é o registro faltante)
```

O problema está no terceiro termo. **`_fbp` é o cookie de primeira parte do
pixel do Meta — ele é gravado no navegador de todo visitante da LP**, tenha ou
não visto um anúncio. Não é sinal de contato com mídia paga; é sinal de que a
pessoa abriu a página com o pixel instalado.

A decomposição dos 660:

| Sinal | Opps | O que significa de fato |
|---|---:|---|
| `fbclid` | 389 | clique de saída vindo do Meta (pago **ou** orgânico) |
| `fbclid` ∪ `fbc` | 452 | idem, incluindo o cookie derivado do fbclid |
| **+ `fbp`** | **660** | **+208 que só têm cookie de pixel — zero valor de atribuição** |

A contradição aparece na cara dos dados: **164 linhas com `utm_source=google` e
gclid do Google Ads estão marcadas `Sinal Meta = Sim`**. E 168 linhas têm
`Click ID Google = Sim` **e** `Sinal Meta = Sim` ao mesmo tempo.

**O alívio:** essa coluna não entra em nenhuma das regras de classificação. Ela
está na planilha como informação lateral, então **não contaminou o 1.900**.

**O risco:** se o time usar essa coluna para reclassificar leads como Meta pago
— que é exatamente a tentação, dado o nome dela —, vai superestimar o Meta em
cerca de **3x** (660 no lugar de ~220).

---

## 5. Por que o `fbclid` não pode ser usado como o `gclid`

A pergunta natural é: se o gclid resgata lead do Google, por que o fbclid não
resgata lead do Meta? Porque os dois parâmetros não são equivalentes:

- **`gclid` / `gbraid` / `wbraid`** só existem em clique pago do Google Ads.
  Presença = anúncio. Sem ambiguidade.
- **`fbclid`** é anexado pelo Meta a **qualquer** clique de saída da plataforma
  — story orgânico, post de feed, link da bio. Presença = veio do Meta, não
  necessariamente de anúncio.

**A prova está nos próprios dados da Caveo:** 68 oportunidades com
`utm_source=bioinsta&utm_medium=social&utm_content=link_in_bio` — o link da bio
do Instagram, inequivocamente orgânico — carregam `fbclid`/`fbc`.

Ou seja: **a decisão de não usar o fbclid como regra de classificação está
tecnicamente correta.** Não é uma omissão, é o comportamento certo.

### O ponto cego que sobra

Isso cria uma assimetria real: lead pago do Google com UTM quebrado é resgatado
pelo gclid; lead pago do Meta com UTM quebrado **não tem resgate possível**.

Quantifiquei o tamanho exato do ponto cego — oportunidades com click ID do Meta,
sem nenhum `utm_medium` e sem click ID do Google:

**9 oportunidades.** São elas: OP-049632, OP-052524, OP-052783, OP-053204,
OP-053789, OP-054254, OP-054645, OP-054673, OP-058021.

**Todas as 9 estão em Perdido ou Contato Realizado. Nenhuma virou fechamento.**
Impacto em receita mal atribuída no período: **zero**.

---

## 6. Falha de captura do click ID (achado técnico novo)

O caminho inverso do item 2 também existe: **15 oportunidades têm `gclid=` ou
`gbraid=` na URL de origem, mas os campos `gclid__c`/`gbraid__c`/`wbraid__c` do
Salesforce estão vazios.** O click ID chegou na landing page e não foi
persistido no campo dedicado — uma perda de captura de ~1,2%.

Para a classificação isso não muda nada (a URL ainda denuncia). **Para conversão
offline / Enhanced Conversions muda tudo**, porque esses mecanismos leem o
campo, não a URL.

---

## 7. Batimento com as plataformas

### Google Ads — ação `opportunity_created`

É a ação certa para comparar, porque é a que dispara do Salesforce via Zapier
quando a oportunidade é criada.

| Mês | `opportunity_created` | Opps Google na planilha | Gap |
|---|---:|---:|---:|
| 2026-06 | 160,9 | 134 | +20% |
| 2026-07 | 212,9 | 168 | +27% |
| 2026-08 (1–24) | 1.054,7 | 1.059 | **−0,4%** |

Agosto bate quase perfeito. Jun/Jul o Google reporta mais, e isso é **esperado**:
a plataforma credita a conversão à data do **clique**, não da criação da
oportunidade, e inclui conversões modeladas (os decimais denunciam a modelagem).

A ação `Formulário LP` reporta 460 / 668 / 1.292 no mesmo período — muito acima
de tudo. É a ação poluída já conhecida, em que cada etapa do formulário conta
como lead. **Não usar para reconciliação.**

### Meta Ads — `complete_registration`

| Mês | `complete_registration` | Opps Meta na planilha | Gap |
|---|---:|---:|---:|
| 2026-06 | 142 | 144 | +1,4% |
| 2026-07 | 177 | 169 | −4,5% |
| 2026-08 (1–24) | 350 | 223 | **−36%** |

Junho e julho batem muito bem — margem de 5%, que é o normal para atribuição por
janela de clique. **Agosto abre um buraco de 127 leads** que a planilha não vê.

No mesmo mês o evento `lead` do pixel despencou (629 em julho → 227 em agosto)
enquanto o `complete_registration` dobrou (177 → 350). Alguma coisa mudou na
medição em agosto. Isso é uma investigação separada, mas é o ponto onde a
planilha e a plataforma mais divergem em todo o período.

---

## 8. As taxas de fechamento confirmam a classificação por fora

Este é um teste independente: se a classificação estivesse errada, os baldes se
misturariam. Não se misturam.

| Motivo da classificação | Opps | Fechados | Taxa |
|---|---:|---:|---:|
| 1 · Click ID do Google | 1.244 | 112 | **9,0%** |
| 2 · `cpc` sem click ID (≈ Meta) | 626 | 12 | **1,9%** |
| 3 · Link da bio do Instagram | 196 | 40 | **20,4%** |
| 4 · Resposta de formulário no UTM | 95 | 27 | **28,4%** |
| 5 · Sem nenhum rastro | 117 | 36 | **30,8%** |

Os baldes separam limpo em duas famílias: **pago fecha entre 1,9% e 9,0%,
orgânico fecha entre 20% e 31%**. Se o balde "sem rastro" fosse mídia paga
disfarçada, a taxa dele estaria perto de 2–9%, não em 30,8%. Isso é evidência
independente — não circular — de que a linha divisória foi traçada no lugar
certo.

De quebra, um achado comercial: **Google pago fecha 9,0%, Meta pago fecha 1,9% —
uma diferença de 4,7x.**

---

## 9. As 69 linhas "Site" ficaram sem destino

A planilha deixou 69 oportunidades com `Macro origem — sugestão nova = (a
definir)`. São todas `LeadSource = Site`, sem nenhum UTM e sem nenhum click ID.

Elas têm **23 fechamentos — taxa de 33,3%**, que é comportamento de orgânico
(compare com a tabela acima). Somado à ausência total de click ID, a recomendação
é **tirar da macro ADS**. Hoje elas inflam o topo do funil pago sem nenhuma
evidência de mídia.

---

## Conclusão e correções recomendadas

A planilha está correta no que se propôs a fazer. O número 1.900 reconcilia
exatamente, a regra é reproduzível e a decisão mais delicada — usar o click ID do
Google mas não o do Meta — está tecnicamente certa.

As correções, em ordem de urgência:

1. **Aposentar ou renomear a coluna `Sinal Meta?`** — ela inclui `fbp`, que é
   cookie de pixel de todo visitante. Se for mantida, deve virar `fbclid`/`fbc`
   apenas (452 no lugar de 660) e vir com a ressalva de que fbclid não separa
   pago de orgânico no Meta.
2. **Ampliar o recorte para além de `macro = ADS`** — 14 oportunidades com click
   ID do Google ficaram fora da auditoria, classificadas hoje como Masterclass,
   WhatsApp Aulão e MGM.
3. **Investigar o gap de agosto no Meta** — 350 registros na plataforma contra
   223 na planilha, no mesmo mês em que os eventos do pixel se inverteram.

Dois ajustes menores: corrigir o motivo de OP-057598 e resolver o destino das 69
linhas "Site" (a evidência aponta para fora da macro ADS).

E um item técnico que não é da planilha, mas apareceu na auditoria: **15
oportunidades perderam o click ID entre a URL e o campo do Salesforce** — o que
não atrapalha a classificação, mas quebra conversão offline.

---

## 10. O funil (Oportunidades, MQL, SQL, Fechamento) bate com a planilha?

Só a primeira e a última etapa. **MQL e SQL não podem ser derivados desta
planilha** — e isso não é erro de quem a montou, é limitação estrutural do
formato.

| Etapa | Planilha (via `Fase`) | Coleta (SF cumulativo) | Gap |
|---|---:|---:|---:|
| Oportunidades | 2.308 | 2.309 | +1 (+0,0%) |
| MQL | 1.480 | **2.130** | **+650 (+30,5%)** |
| SQL | 259 | **292** | **+33 (+11,3%)** |
| Fechamento | 232 | 237 | +5 (+2,1%) |

### Por que MQL e SQL não batem: foto contra filme

A planilha tem a coluna `Fase`, que é o **estágio atual** da oportunidade. A
rotina de coleta usa `OpportunityHistory` e conta de forma **cumulativa** — a
opp vale como MQL se **já atingiu** "Contato Realizado", "Aguardando Resposta",
"Reunião Agendada" ou "Proposta Enviada" em algum momento
(`QUALIFICATION_RULES` em `config/business-rules.ts`).

A diferença tem nome e sobrenome: **650 das 739 oportunidades hoje em "Perdido"
passaram por um estágio de MQL antes de morrer.** Para a fundação elas são MQL;
na planilha aparecem apenas como "Perdido" e somem da conta.

O mesmo vale para SQL, em escala menor: 33 oportunidades chegaram em "Proposta
Enviada" e depois foram perdidas ou fechadas — a `Fase` atual já não mostra isso.

**Consequência prática: não use a coluna `Fase` para calcular MQL ou SQL.** A
informação necessária (o histórico de transições) não está na planilha. Quem
precisar desses números tem que ir ao `OpportunityHistory`.

### Fechamento: três números legítimos, e o risco de comparar os errados

| Número | Definição | Onde aparece |
|---:|---|---|
| **232** | `Ganha? = Sim` — só o estágio `Fechado` | planilha |
| **237** | `IsWon = true OR StageName = 'Ganho não Identificado'`, coorte por `CreatedDate` | fundação (`WON_CLAUSE`) |
| **264** | mesma cláusula, mas por **janela de fechamento** (`LastStageChangeDate`) | coleta diária/mensal |

Os três estão certos dentro da própria definição — medem populações diferentes:

- **232 → 237:** a planilha ignora os 5 `Ganho não Identificado`. O Salesforce
  marca esse estágio com `IsClosed = false`, mas a operação o conta como ganho
  (está explícito em `STAGE_GROUPS.ganho`).
- **237 → 264:** a coorte pergunta "das opps *criadas* no período, quantas
  fecharam?". A janela pergunta "quantas *fecharam* no período?" — e inclui opps
  criadas antes de junho. É o modelo de duas datas da fundação (`DATE_MODEL`:
  entrada por `CreatedDate`, fechamento por `LastStageChangeDate`).

O risco real é alguém comparar os 232 da planilha com os 264 da coleta diária e
concluir que sumiram 32 fechamentos. Não sumiram — são perguntas diferentes.

### ⚠ A contradição de verdade: a fundação conta `fbclid` como mídia paga

Este é o achado mais grave desta segunda rodada, e ele **inverte o veredicto**:
aqui a planilha está certa e a nossa própria regra de produção está errada.

Em `config/business-rules.ts`:

```ts
export const CRUZAMENTO_RULES = {
  meta: { clickIdFields: ["fbc__c", "fbclid__c"] },   // ← aqui
  google: { clickIdFields: ["gclid__c", "gbraid__c"], excludeIfMetaClickId: true },
}
```

A regra `cruzExpr("meta")` captura toda opp com `utm_medium ≠ cpc` que tenha
`fbclid` ou `fbc`. No período são **79 oportunidades** — e **77 delas a planilha
classifica como ORGÂNICO**:

| Motivo na planilha | Opps |
|---|---:|
| 3 · Link da bio do Instagram (`bioinsta`/`social`/`link_in_bio`) | 68 |
| 4 · Resposta de formulário gravada no UTM | 8 |
| 5 · Sem nenhum rastro | 1 |
| 2 · `utm_medium = paid` (essa é paga mesmo) | 2 |

É exatamente o problema do item 4 desta auditoria — `fbclid` é anexado pelo Meta
a qualquer clique de saída, inclusive do link da bio. Lá era uma coluna
decorativa que não afetava número nenhum. **Aqui está na regra de produção que
alimenta o dashboard e o acompanhamento diário.**

**Impacto em fechamentos do Meta no período:**

| Fonte | Fechamentos Meta |
|---|---:|
| `cpcExpr("meta")` — atribuição direta | 12 |
| `cruzExpr("meta")` — cruzamento por fbclid | **+8** |
| **Total pela fundação** | **20** |
| Planilha (só `cpc`, sem fbclid) | 11 |

A rotina credita ao Meta pago **8 fechamentos que vieram do link da bio do
Instagram** — quase dobrando o resultado da plataforma. Com o Meta já fechando
1,9% contra 9,0% do Google (item 8), esse inchaço mascara ainda mais a diferença
real entre os canais.

### MQL praticamente não filtra nada

Achado lateral que apareceu na conferência: a taxa MQL/Oportunidade é altíssima
nos três meses.

| Mês | Opps | MQL | Taxa |
|---|---:|---:|---:|
| 2026-06 | 410 | 364 | 88,8% |
| 2026-07 | 497 | 430 | 86,5% |
| 2026-08 (1–24) | 1.402 | 1.336 | **95,3%** |

Com "Contato Realizado" carimbado automaticamente poucos segundos após a criação
da oportunidade, **MQL virou sinônimo de lead** — em agosto sobra 4,7% de
filtragem. Como indicador de qualificação, o MQL hoje não informa nada; o
primeiro gate que realmente separa é o SQL (Proposta Enviada), que fica em 292 de
2.309 (12,6%).

### Resumo da segunda rodada

| Pergunta | Resposta |
|---|---|
| Oportunidades bate? | **Sim** — diferença de 1 registro |
| MQL bate? | **Não** — planilha subconta 30,5%; a `Fase` não carrega histórico |
| SQL bate? | **Não** — subconta 11,3%, mesma causa |
| Fechamento bate? | **Quase** — faltam os 5 `Ganho não Identificado`; e cuidado com coorte (237) × janela (264) |
| A classificação paga bate com a fundação? | **Não, e a planilha está certa** — a fundação infla o Meta em 8 fechamentos via `fbclid` |
