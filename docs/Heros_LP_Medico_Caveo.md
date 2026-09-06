# Heroes de Landing Page — Público Médico — Caveo

> **O que é:** seis variações de hero para a landing page única de aquisição,
> construídas para servir **os dois estados de PJ** (quem não tem e quem já
> tem) sem bifurcar o visitante em dois botões.
> **Origem:** decorre de `Auditoria_LP_v2_Caveo.md` (13/08) e do spec de
> estrutura `docs/superpowers/specs/2026-08-06-lp-alta-conversao-medico-design.md`.
> **Régua:** `Manual_Comunicacao_Oferta_Caveo.md` (o hero é bloco de **Oferta**)
> e `Manual_Comunicacao_Funcionalidade_Caveo.md` para o que atravessa os pilares.
> **Data:** 2026-08-13.
>
> ⚠️ **Substitui `docs/archive/Hero_Variacoes_Copy_LP_Caveo.md` (06/2026).**
> Aquele documento está integralmente fora da régua atual — ver seção 1.

---

## 1. Por que o material de hero anterior não serve mais

As quatro variações de 06/2026 foram escritas antes dos manuais de comunicação.
Todas violam a regra-mãe:

| Recurso usado lá | Regra que o proíbe hoje |
|---|---|
| "até 30% da renda em tributos que dá para reduzir" (nas 4) | Teto da promessa, Oferta §1 — a Caveo não promete resultado financeiro |
| Eyebrow "FEITO POR MÉDICOS, PARA MÉDICOS" | Oferta §3.1 — família banida, string quase literal |
| CTA "Quero parar de perder dinheiro" / "Ver quanto estou perdendo" | Promessa de ganho + CTA fora da lista (Oferta §7.1) |
| CTA "raio-X gratuito" | Fora da lista aprovada; e o CTA precisa sinalizar contato comercial |
| "metade vai embora em imposto" | §1 e §4 — número não autorizado |

**Consequência prática:** o eixo mais afiado do material antigo — *dinheiro que
você perde em imposto* — está fechado. A agressividade precisa ser reconstruída
sobre os eixos que o manual **autoriza** e que a LP atual subusa:

| Eixo permitido | Onde está na régua | Estado na LP v2 |
|---|---|---|
| **Tempo e dependência** | Autonomia é o eixo emocional canônico (Func §7.2) | Existe, mas só em bullets internos |
| **Custo do não-agir** | É a espinha escolhida no spec de LP (§2) | Ausente do hero |
| **Erro e multa** | "Multa" é *"a palavra que mais chama atenção"* (Oferta §2.4) | Só num benefício da S3 |
| **Clareza** | *"Você sabe exatamente quanto sobra"* está na coluna ✅ do teto da promessa | Só num benefício da S3 |
| **Especialização provada** | Alternativas aprovadas ao slogan banido (Oferta §3.1) | Dita como slogan, não provada |

---

## 2. Decisões que valem para as seis variações

**2.1 — Público único, sem bifurcação no botão.** A LP é uma só e serve os dois
estados de PJ. Logo, o hero **não pode** usar "ABRA SUA PJ GRATUITAMENTE" (só
serve quem não tem) nem "TRAGA SUA PJ PARA A CAVEO" (só serve quem tem, e é o
erro estratégico N5 da auditoria — fecha o hero para o cluster de menor
conversão).

**2.2 — A bifurcação vive na subheadline, em uma linha fixa.** Todas as seis
usam a mesma construção de abertura:

> **"Abra a sua PJ ou traga a que você já tem..."**

Isso é deliberado em dois níveis. Primeiro, resolve o problema de CRO — o
visitante não precisa se autoclassificar num botão no primeiro segundo.
Segundo, **trava a variável do teste**: como a subheadline é fixa, a diferença
de conversão entre as variações é atribuível à H1, e só a ela (mesma lógica de
Oferta §7.4 para CTA).

É também a correção do único ponto onde a LP v2 já tenta fazer isso e erra — o
subhead da S7, que escreve *"Abra sua **empresa** gratuitamente ou traga sua
PJ"*, usando dois termos para a mesma ação.

**2.3 — CTA único: `CONTE COM A CAVEO`.** É o único da lista aprovada
(Oferta §7.1) que serve os dois estados de PJ, e já existe na página (S2), então
não é string nova. O botão do formulário padroniza em `FALE COM NOSSOS
ESPECIALISTAS` (Func §8.1), que é o único CTA da LP atual que sinaliza
corretamente o fluxo real. **A página inteira passa a ter 2 strings de CTA, não
6.**

**2.4 — Formato, para segurar o "sem muito texto":**

| Elemento | Limite |
|---|---|
| Eyebrow | ≤ 3 palavras |
| **H1** | **≤ 10 palavras**, idealmente duas frases curtas — a tensão na primeira, a virada na segunda |
| Subheadline | 1 frase, ≤ 20 palavras |
| Botão | 1, nunca 2 |
| Microcopy | 1 linha, e serve para declarar o fluxo real ("um especialista entra em contato") |

**2.5 — O que sai da primeira dobra:**

- **O card "30% Economia média em impostos"** — viola o teto da promessa
  (auditoria P1.1). Ficam dois cards factuais: médicos atendidos e estados.
- **A palavra "Aplicativo"/"App"** — o hero é bloco de Oferta; o app entra nos
  blocos de Funcionalidade (spec §3, achado N4).
- **"criado para médicos"** — família banida (Oferta §3.1).

**2.6 — Agressividade mira a perda e o modelo, nunca o médico.** A provocação
boa é a que faz o médico se reconhecer no problema; a ruim julga a escolha dele
(Oferta §6.2). Nenhuma das seis diz ou sugere que o médico foi ingênuo.

---

## 3. As seis variações

Ordenadas por intensidade, da mais contida para a mais dura.

### V1 — A ROTINA · *contido* ✅ recomendada para estrear

```
MÉDICO

Sua rotina médica já é complexa.
Sua PJ não precisa ser.

Abra a sua PJ ou traga a que você já tem
para quem entende plantão.

[ CONTE COM A CAVEO ]

Um especialista entra em contato com você.
```

- **Gatilho:** alívio. Reconhecimento sem nenhuma acusação embutida.
- **Nota:** esta frase **já existe na LP** — é a headline da Seção 6, e é a melhor
  linha do documento inteiro. Está enterrada na sexta dobra.
- **Risco a vigiar:** é a mais macia das seis. Sozinha, não testa tensão nenhuma
  — por isso entra como controle, com uma provocativa em paralelo.

### V2 — QUEM CUIDA · *tenso*

```
MÉDICO

Quem cuida da sua PJ
sabe o que é uma cooperativa?

Abra a sua PJ ou traga a que você já tem
para especialistas na rotina médica.

[ CONTE COM A CAVEO ]
```

- **Gatilho:** especialização **provada por pergunta**, não afirmada por slogan.
- **Por que resolve um problema:** é a resposta direta ao achado P0.1 — entrega o
  efeito de "de médico para médico" sem usar a frase banida. O verbo faz o
  trabalho que o selo "FEITA PARA MÉDICOS" tenta fazer e não pode.
- **Risco:** quem ainda não tem PJ pode não se enxergar no verbo "cuida" — o
  "Abra a sua PJ ou" da subheadline é o que segura essa metade do público.

### V3 — SEIS ANOS · *provocativo* ✅ recomendada como desafiante

```
MÉDICO

6 anos estudando medicina.
Nenhuma aula sobre a sua PJ.

Não precisa ser você a aprender agora.
Abra a sua PJ ou traga a que você já tem.

[ CONTE COM A CAVEO ]
```

- **Gatilho:** a vergonha transversal do *"ninguém me ensinou isso"* — a única
  dor que é **idêntica** nos dois estágios de carreira e nos dois estados de PJ.
  É o que torna esta a variação mais eficiente para uma página única.
- **Número:** "6 anos" está na lista autorizada (Oferta §4), sem restrição de uso.
- **Risco:** encosta no julgamento. A subheadline **precisa** aliviar — "não
  precisa ser você a aprender" é o que impede a leitura de "você deveria saber
  disso". Nunca inverter a ordem das duas frases da sub.

### V4 — A ESPERA · *tenso*

```
MÉDICO

O plantão não espera.
O contador tradicional, sim.

Abra a sua PJ ou traga a que você já tem
e resolva sem depender do horário de outra pessoa.

[ CONTE COM A CAVEO ]
```

- **Gatilho:** irritação reconhecível com a dependência. É o eixo emocional de
  autonomia (Func §7.2), o mais validado do público.
- **Terminologia:** "contador **tradicional**", nunca solto e nunca "genérico"
  (Oferta §2.2) — a provocação mira o modelo, não uma pessoa.
- **Sem número de propósito:** o contraste "até 72 horas × menos de 1 minuto"
  pertence ao bloco de comparação, não ao hero. Claim de tempo é **único na
  página inteira** (Func §5.1) e não pode aparecer em duas forças diferentes.
- **Risco:** o médico satisfeito com o próprio contador pode ficar defensivo.
  A construção genérica ("horário de outra pessoa") é o que evita isso.

### V5 — QUANTO SOBROU · *tenso a provocativo*

```
MÉDICO

Você sabe quanto sobrou
do seu último plantão?

Abra a sua PJ ou traga a que você já tem
e tenha esse número na mão, sempre.

[ CONTE COM A CAVEO ]
```

- **Gatilho:** clareza — a **única** promessa de dinheiro que o manual autoriza.
  *"Você sabe exatamente quanto sobra"* está literalmente na coluna ✅ da tabela
  do teto da promessa (Oferta §1).
- **Risco:** é uma pergunta que uma parte do público responde "sei". Mede bem
  justamente por isso — quem responde "não sei" é lead qualificado.
- **Não apoiar com "7 em cada 10 médicos não sabem quanto faturam":** o dado
  está **bloqueado** por fonte não validada (spec §8, Oferta §11.4). Numa LP ele
  seria afirmação factual permanente, não retórica de criativo.

### V6 — A MULTA · *o mais duro* ⚠️ exige aval do cliente

```
MÉDICO

Enquadramento incorreto não avisa.
Chega como multa.

Abra a sua PJ ou traga a que você já tem
para quem conhece a rotina médica.

[ CONTE COM A CAVEO ]
```

- **Gatilho:** aversão a erro fiscal — a dor cujo medo é desproporcional ao valor
  financeiro em si ("manchar o nome"). Usa **"multa"**, identificada nas calls
  como a palavra que mais chama atenção do léxico aprovado (Oferta §2.4), e que
  hoje não aparece em nenhuma posição de destaque da LP.
- **Terminologia:** "enquadramento **incorreto**", a forma sancionada — não
  "errado", não "fiscal contábil", não "CNAE" (Oferta §2.4).
- **Por que não é urgência artificial:** a linha não diz "corra" nem "última
  chance" — descreve o que acontece. Ainda assim é a que mais se aproxima do
  limite de Oferta §3.4.
- **Risco:** se a direção de arte reforçar o medo (vermelho, ícone de alerta,
  exclamação), a peça cruza para tom apelativo e perde o ativo de
  especialização. **Visual sóbrio é condição para esta variação existir.**

---

## 4. Recomendação de teste

Oferta §3.4 é explícito: *"a primeira variação de um teste deve ser a mais
contida; versões mais provocativas entram depois, como variação, nunca como
estreia."*

| Rodada | Variações | Por quê |
|---|---|---|
| **1** | **V1 (controle) × V3 (desafiante)** | V1 é o registro atual da marca, melhorado; V3 é a mais transversal aos dois estados de PJ e a que tem o gatilho mais universal. Testa se tensão bate contida |
| **2** | vencedora × **V2** ou **V4** | V2 se a rodada 1 indicar que confiança/especialização pesa; V4 se indicar que tempo/dependência pesa |
| **3** | vencedora × **V5** | Clareza é o eixo mais defensável do manual — bom teto se as anteriores saturarem |
| **—** | **V6** | Só depois de aval explícito do cliente sobre o tom, e com direção de arte sóbria acordada antes |

**Condição de leitura do teste:** subheadline e CTA ficam **fixos** em todas as
variações. Se a subheadline variar junto com a H1, o teste não responde nada
(Oferta §7.4).

**Pré-requisito técnico (spec §9):** o teste só é legível se a página entregar
HTML renderizado no servidor, tiver LeadSource próprio no Salesforce, disparar
**um único** evento de conversão no submit e exigir e-mail — a conversão de
Oportunidade no Google Ads casa por e-mail (~92%), não por gclid (~0,25%).

---

## 5. Checklist de aprovação do hero

Rodar em qualquer variação antes de subir:

- [ ] Nenhuma variação de "de médico para médico" / "criado para médicos"
- [ ] Busca literal por "empresa" → zero; "PJ" no feminino
- [ ] Nenhuma promessa de patrimônio, economia, imposto reduzido ou garantia
- [ ] H1 não repete a frase do CTA (Oferta §3.5)
- [ ] Um botão só; nenhum segundo CTA concorrendo na dobra
- [ ] "app"/"aplicativo" ausentes — o hero é bloco de Oferta
- [ ] Nenhum número fora da lista autorizada; "7 em cada 10" bloqueado
- [ ] "contador tradicional", nunca solto nem "genérico"
- [ ] Registro consistente: "você" em toda a peça, nunca misturado com "te"
- [ ] Identidade médica: palavra no texto **e** marcador visual (jaleco,
      estetoscópio, crachá, consultório simulado — nunca hospital real)
- [ ] Nenhuma afirmação de que sem PJ o médico não consegue plantão
- [ ] Microcopy declara que **um especialista entra em contato** — não existe
      autocredenciamento

---

## 6. Referências

- `docs/Auditoria_LP_v2_Caveo.md` — auditoria que originou estes heroes
- `docs/Manual_Comunicacao_Oferta_Caveo.md` — régua do pilar dono do hero
- `docs/Manual_Comunicacao_Funcionalidade_Caveo.md` — regras que atravessam os pilares
- `docs/superpowers/specs/2026-08-06-lp-alta-conversao-medico-design.md` — estrutura da página
- `docs/Dores_Desejos_Publicos_Caveo.md` — dores por estágio de carreira
  (⚠️ o documento é anterior aos manuais e contém termos hoje banidos)
- `docs/archive/Hero_Variacoes_Copy_LP_Caveo.md` — **aposentado**, ver seção 1
