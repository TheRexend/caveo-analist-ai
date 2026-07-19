# Demand Gen — Levantamento de público por segmento (RF e MM) · Caveo

> **Versão:** 2026-06-16 · **Conta:** `392-112-7876`
> **Decisões aplicadas:** **1 campanha** Demand Gen com **conjuntos (ad groups) por público** · **Lookalike é prioridade**.
> **Base:** `docs/Google_Ads_Segmentos_Caveo.md` (segmentos personalizados/combinados completos) + `docs/Dores_Desejos_Publicos_Caveo.md` (ângulos criativos).
> **Escopo deste doc:** blueprint pronto para montar a campanha — quais públicos colar em cada conjunto, demografia, exclusões, sementes de lookalike, orçamento e leitura.

---

## 0. Alerta sobre orçamento compartilhado (ler antes de montar)

Você escolheu **1 campanha** (orçamento único). Implicação real da Demand Gen:

> O algoritmo distribui o orçamento para **o que converte mais barato**. Como o **RF é mais barato e tem
> mais volume** que o **MM** (CPA do MM em Search é ~3× o do RF) e o **remarketing é o mais barato de todos**,
> o sistema tende a **drenar a verba para RF/remarketing e sufocar a prospecção de MM**.

**Mitigações (sem mudar a decisão de 1 campanha):**
- Mantenha o **remarketing fora desta campanha** (campanha própria ou nem entra agora) — senão ele come tudo.
- Acompanhe o gasto **por conjunto** na 1ª–2ª semana. Se o MM ficar com migalhas, o ajuste correto é
  **separar o MM em campanha própria** (decisão reversível a qualquer momento).
- Estratégia de lance: **Maximizar conversões** no início (sem tCPA) para a campanha sair da aprendizagem; migrar para **tCPA** depois, ciente de que o tCPA único achata RF e MM no mesmo alvo.

---

## 1. Como a Demand Gen consome público (mecânica essencial)

A Demand Gen aceita **4 tipos de público** + **demografia**, atribuídos **por conjunto (ad group)**:

| Tipo | O que entra | Papel para a Caveo |
|---|---|---|
| **Segmentos personalizados** | `CS-RF-*`, `CS-MM-*` (palavra‑chave + URL + app) | **QUEM é médico** — a única peça que isola médico |
| **Lookalike segments** | Semente de 1ª parte (clientes/visitantes) + alcance | Acha "novos médicos parecidos com quem já é cliente" |
| **Interesses** | In-market, afinidade, **eventos da vida** | O **momento/intenção** (formatura, abrir empresa, imposto) |
| **Seus dados** | Remarketing / Customer Match | Reengajar quem já visitou (campanha à parte) |
| **Demografia** | Idade, gênero, renda, status parental | **Estreita (E)** qualquer conjunto acima |

**Regras que definem o desenho:**
1. **Dentro de um conjunto, públicos somam por OU (ampliam).** Misturar `CS-MM-01` (médico) **com** in-market "Contabilidade" no **mesmo** conjunto = você passa a atingir *médicos OU qualquer pessoa querendo contador* → **dilui o nicho**. Por isso **isolamos médico em conjuntos próprios** e usamos os segmentos combinados (E) quando queremos cruzar médico ∩ momento.
2. **Demografia é E (estreita).** Idade/renda/gênero recortam o conjunto sem diluir.
3. **Segmentação otimizada (optimized targeting):** quando ligada, o Google **vai além** do seu público. **Desligue nas 2 primeiras semanas** para ler limpo qual conjunto funciona; **ligue depois** para escalar.
4. **Lookalike:** exige **semente com ~1.000+ usuários ativos**; alcance **Estreito (2,5%) → Balanceado (5%) → Amplo (10%)**. Comece **Estreito** (qualidade).
5. **Posicionamentos:** YouTube (feed, in-stream, **Shorts**), Discover e Gmail. Idioma **Português**, **Brasil**.

---

## 2. Arquitetura — 1 campanha, conjuntos por público

```
Campanha:  [DG] Caveo — Prospecção (Max. Conversões · BR · PT)
│
├── Conjunto  RF · Custom Intent      → segmentos personalizados RF (médico em formação)
├── Conjunto  RF · Lookalike          → semente 1ª parte + Estreito, recorte idade 23–30
│
├── Conjunto  MM · Custom Intent      → segmentos personalizados MM (médico PJ estabelecido)
├── Conjunto  MM · Lookalike          → semente = clientes pagantes (Estreito)
└── Conjunto  MM · Momento + Reforma  → segmento COMBINADO (médico ∩ imposto/Reforma)

(Remarketing fica em campanha própria — ver §5)
```

> 6 conjuntos é o teto saudável para uma campanha só. Se quiser começar enxuto: suba **RF·Custom Intent**,
> **MM·Custom Intent** e **MM·Lookalike** (os 3 de maior tração) e adicione os demais na semana 2.

---

## 3. Público RF — Recém-formado

**Recorte transversal do público:** idade **23–30**, Brasil (peso em capitais e polos de faculdade de medicina),
ângulo **"começar certo / sair na frente" + CNPJ grátis**, formato **vídeo vertical (Shorts/Reels) + depoimento de colega**, urgência sazonal (jan/jul, provas de residência).

| Conjunto | Público a colar | Demografia (E) | Segm. otimizada | Ângulo criativo |
|---|---|---|---|---|
| **RF · Custom Intent** | `CS-RF-01` (médico em formação/residência) **+** `CS-RF-02` (1º CNPJ/1º plantão) **+** os PURCHASE_INTENT existentes `faculdades de medicina`, `cursos preparatórios para residência` | Idade **18–34** (núcleo 23–30); educação superior/cursando | **OFF** (2 sem.) | "Formou? Abra seu CNPJ de graça antes do 1º plantão" — educativo + urgência |
| **RF · Lookalike** | Lookalike, semente `All Users of lp.caveo.com.br` (14.000) **ou** `All Converters` — alcance **Estreito** | Idade **23–30** (recorte crítico p/ separar do MM) | OFF | "Médicos que começaram certo com a Caveo" — prova social de par |

> **CS-RF-01 (núcleo):** palavras `residência médica`, `prova de residência`, `revalida`, `internato medicina`, `colação de grau medicina`, `recém formado medicina`; URLs `sanarmed.com`, `jaleko.com.br`, `medway.com.br`, `estrategiamed.com.br`, `aristo.com.br`; apps Whitebook, Jaleko, Sanar, Medway.
> **CS-RF-02:** `como abrir cnpj medico`, `abrir pj medico`, `cnpj para medicos`, `cnpj ou clt medico`, `simples nacional médico`, `vaga plantão recém formado`, `quanto ganha plantão médico`. *(listas completas no doc de estratégia)*

**Por que sem conjunto "Momento" no RF:** o RF tem **baixa consciência** — o gatilho é educar, não capturar intenção tributária. O custom intent + lookalike + recorte de idade já entregam o médico jovem certo.

---

## 4. Público MM — Médico Maduro

**Recorte transversal:** idade **30–55**, **renda alta** (faixas superiores), prioridade geográfica **SP / RJ / BA**
(espelha a campanha de Search regional que já existe), ângulo **"até 30% de economia" + "migração sem risco" + "contador que entende médico"**, formato **vídeo de profundidade + número-choque + prova social de par** (anestesista, intensivista). Retargeting é essencial (decisão longa).

| Conjunto | Público a colar | Demografia (E) | Segm. otimizada | Ângulo criativo |
|---|---|---|---|---|
| **MM · Custom Intent** | `CS-MM-01` (plantonista PJ) **+** `CS-MM-02` (otimização/troca de contador) **+** `CS-MM-03` (consultório/sociedade) **+** o existente `PJ médico` | Idade **30–55**; renda **alta** | **OFF** (2 sem.) | "Seu contador trata sua PJ médica como uma padaria?" — quebra de objeção |
| **MM · Lookalike** | Lookalike, semente **`Lista de clientes pagantes 9.10` (7.100)** — alcance **Estreito** | Idade **30–55**; renda alta | OFF | "Médicos PJ que pagam até 30% menos imposto" — número-choque |
| **MM · Momento + Reforma** | Segmento **COMBINADO** `SC-MM-REFORMA` = (`CS-MM-01` OU `CS-MM-02`) **E** (In-market *Preparação de impostos* OU termos de Reforma) | Idade **30–55** | OFF | "Reforma Tributária 2026: quanto vai pesar no seu plantão?" — urgência/gatilho |

> **CS-MM-01:** `pj medico`, `cnpj para medicos`, `escala de plantão`, `cooperativa médica`, `RPA médico`, `pró-labore médico`, `quanto médico paga de imposto`; URLs `doctoralia.com.br`, `iclinic.com.br`, `feegow.com`, `unimed.coop.br`; apps iClinic, Feegow, Doctoralia.
> **CS-MM-02:** `contador para médico`, `contabilidade especializada médico`, `trocar de contador`, `como pagar menos imposto pj`, `planejamento tributário médico`, `lucro presumido médico`, `holding médica`, `reforma tributária médico`, `reforma tributária pj 2026`.
> **CS-MM-03:** `abrir consultório médico`, `sociedade médica`, `faturamento clínica`, `gestão financeira consultório`.

> **MM · Lookalike é o conjunto mais promissor da conta:** semente de **7.100 clientes pagantes** (médicos PJ reais) é
> ouro para a Demand Gen achar "mais médicos como esses". É exatamente o que substitui os "públicos semelhantes" descontinuados.

---

## 5. Remarketing (campanha própria — não nesta)

Para não canibalizar o orçamento de prospecção (§0), o remarketing vai em **campanha Demand Gen separada**:

| Conjunto | Público | Exclusão |
|---|---|---|
| `RMKT · Não converteu` | `All Users of lp.caveo.com.br` (14.000) **+** `TP - Visitantes LP - 90D` | **NÃO** `All Converters` **+** `Lista de clientes pagantes 9.10` |

Mensagem: quebra de objeção (MM) / lembrete de urgência sazonal (RF), conforme quem visitou.

---

## 6. Lookalike — sementes recomendadas

| Semente | Tamanho | Serve para | Alcance inicial | Observação |
|---|---:|---|---|---|
| **`Lista de clientes pagantes 9.10`** | 7.100 | **MM** (clientes pagantes = médicos PJ estabelecidos) | **Estreito (2,5%)** | Melhor semente da conta |
| `All Users of lp.caveo.com.br` | 14.000 | RF + MM (misto) — usar com recorte de idade | Estreito | Recortar idade p/ direcionar RF (23–30) ou MM (30–55) |
| `Clientes Caveo SalesForce` | 1.100 | MM | Estreito | Reforço da semente de pagantes |
| `All Converters` | 700 | (qualquer) | — | **⚠ Abaixo de ~1.000** — pode não habilitar lookalike sozinha; combine com outra |

**Lacuna a resolver:** não há **semente RF pura** (lista só de recém-formados). Enquanto não existir, o RF·Lookalike
depende de **recorte de idade 23–30** sobre semente mista. **Recomendação:** criar no Salesforce/CRM uma lista de
clientes que entraram como RF e subir como Customer Match → semente RF dedicada (melhora muito a qualidade).

---

## 7. Exclusões padrão (aplicar em TODOS os conjuntos de prospecção)

| Excluir | Tamanho | Motivo |
|---|---:|---|
| `Lista de clientes pagantes 9.10` | 7.100 | Não pagar para reimpactar quem já paga |
| `Clientes Caveo SalesForce` | 1.100 | Idem |
| `All Converters` | 700 | Já converteu → vai p/ remarketing/upsell, não prospecção |

---

## 8. Demografia & geo por público

| | RF | MM |
|---|---|---|
| **Idade** | 18–34 (núcleo **23–30**) | **30–55** |
| **Renda** | sem recorte (em transição) | **faixas altas** |
| **Gênero** | todos | todos (ver nota Camila) |
| **Geo** | BR — peso em capitais + polos de faculdade | BR — **SP / RJ / BA** prioritário |
| **Idioma** | Português | Português |

> **Nota persona Camila (MM feminino premium):** se quiser explorar o recorte da intensivista cooperativa+RPA,
> crie um conjunto MM extra segmentado por **gênero feminino** com criativo premium/consultivo — teste avançado, fase 2.

---

## 9. Orçamento, lances e aprendizado

- **Lance:** começar em **Maximizar conversões** (sem tCPA) até sair da aprendizagem (~conversões suficientes em 1–2 semanas); depois migrar para **tCPA**.
- **Conversão otimizada:** usar a ação de **lead** correta (idealmente a de maior qualidade do funil; lembrar que `opportunity_created` é o sinal de fundo subutilizado — ver doc de estado da conta).
- **Aprendizado:** Demand Gen precisa de **volume de conversão** e ~**7–14 dias** estável. **Não mexa** em público/lance nesse período.
- **Distribuição (com a ressalva do §0):** monitore gasto por conjunto; se MM < ~20% do gasto e tiver intenção real, separe o MM em campanha própria.

---

## 10. Leitura & escala

1. **Semana 1–2 (otimização OFF):** leia **conversões e CPA por conjunto**. Isso diz qual sinal funciona — custom intent vs lookalike vs momento.
2. **Promova vencedores:** suba orçamento/peso nos conjuntos que convertem; pause/refaça os que só gastam.
3. **Ligue a segmentação otimizada** nos conjuntos vencedores para escalar alcance mantendo o aprendizado.
4. **Amarre ao Salesforce:** medir **Lead → Oportunidade → Cliente** por conjunto (não só CPL). MM tolera CPL maior se Lead→Cliente compensar; RF avalia por coorte (LTV de carreira).

---

## 11. Checklist de construção (UI)

- [ ] Criar **segmentos personalizados** `CS-RF-01/02`, `CS-MM-01/02/03` (Gerenciador de públicos) — ver doc de estratégia.
- [ ] Criar **segmento combinado** `SC-MM-REFORMA`.
- [ ] Criar **lookalike** com semente `Lista de clientes pagantes 9.10` (Estreito) e uma mista por idade.
- [ ] Criar campanha **[DG] Caveo — Prospecção** (Max. Conversões · BR · PT).
- [ ] Montar os **6 conjuntos** (§2) com público, demografia e **exclusões** (§7); segmentação otimizada **OFF**.
- [ ] Subir criativos por ângulo de público (RF educativo/urgência · MM número/objeção/Reforma) — vídeo vertical + estático.
- [ ] Criar **campanha separada de remarketing** (§5).
- [ ] (Pendência) Criar **semente RF dedicada** via Customer Match para fortalecer o RF·Lookalike.

> **Limite de execução:** conector Google Ads é **somente leitura** — segmentos, lookalikes e campanha são montados manualmente na UI seguindo este blueprint.
