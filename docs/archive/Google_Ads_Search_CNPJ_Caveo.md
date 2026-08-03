# Google Search — Anúncios (RSA) · Caveo · CNPJ médico sem custo

> **Versão:** 2026-06-22 · **Conta:** `392-112-7876`
> **Formato:** Responsive Search Ad (RSA). Limites: **Título ≤ 30** · **Descrição ≤ 90** · **Caminho ≤ 15** · **Callout ≤ 25** · **Snippet ≤ 25**.
> Até **15 títulos** + **4 descrições** por anúncio.
> **Público-alvo:** Médico recém-formado / formando (personas *Larissa* e *Diego*).
> **Ângulo:** abertura de CNPJ **sem custo** + alívio da dor emocional ("não sei por onde começar") + simplicidade/facilidade + **a Caveo faz o trabalho duro**.
> **URL final:** `lp.caveo.com.br` (LeadSource "LP Turbo") · **UTM:** `utm_source=google&utm_medium=cpc&utm_campaign=search_rf_cnpj&utm_content=cnpj_gratis`
> **Base:** `docs/Dores_Desejos_Publicos_Caveo.md` · `docs/personas_recem_formados.md`
> *(Nº entre colchetes = contagem de caracteres.)*

---

## ⚠️ Alerta crítico de Search (ler antes de subir)

`lp.caveo.com.br` é uma **SPA JS-only**: o robô do Google vê HTML praticamente vazio. No **Search isso pesa muito mais que no Demand Gen**, porque a relevância do anúncio e o **Índice de Qualidade** dependem do casamento entre **palavra-chave ↔ texto do anúncio ↔ conteúdo da landing page**. Sem conteúdo renderizado no HTML (palavras como "CNPJ médico", "grátis", "abrir PJ"), o resultado provável é **"Relevância da página de destino abaixo da média"**, Índice de Qualidade baixo e **CPC mais caro**.

**Recomendação:** renderizar a LP no servidor (SSR) ou prerender para o Googlebot, garantindo que o texto-âncora (CNPJ médico grátis, abrir PJ, feito por médicos) e o formulário apareçam no HTML inicial. Enquanto isso não acontece, os anúncios rodam — mas com penalidade de qualidade.

---

## Anúncio RSA — "CNPJ médico de graça, sem você precisar entender de nada"

### Títulos (≤30) — 15 ativos

```
[29]  Abra seu CNPJ médico de graça      ← sugerido PIN posição 1
[26]  Não sabe por onde começar?         ← sugerido PIN posição 1
[25]  CNPJ médico 100% gratuito
[26]  Abertura de CNPJ sem custo
[27]  A gente faz o trabalho duro
[29]  Nós cuidamos de tudo pra você
[28]  Você assina, a Caveo resolve
[22]  Sem burocracia nenhuma
[25]  Simples, rápido e sem dor
[27]  Tudo resolvido pelo celular
[26]  CNPJ pronto pro 1º plantão
[28]  Plataforma feita por médicos       ← sugerido PIN posição 2 ou 3
[26]  +15.000 médicos já confiam          ← sugerido PIN posição 2 ou 3
[27]  Comece certo. Comece agora.        ← sugerido PIN posição 3
[25]  Abrir PJ pode ser simples
```

**Alternates (para girar/testar):**
```
[25]  O 'e agora?' da formatura
[30]  CNPJ médico parece complicado?
[27]  Esqueça papelada e estresse
[28]  Quem entende de médico cuida
[24]  Abra seu CNPJ hoje mesmo
```

### Descrições (≤90) — 4 ativas

```
[81]  Não sabe por onde começar? A Caveo abre seu CNPJ médico de graça e cuida de tudo.
[85]  Esqueça a burocracia: a gente faz o trabalho duro pra você começar sem dor de cabeça.
[85]  Plataforma feita por médicos. Abra seu CNPJ, emita nota e pague imposto em um só app.
[79]  Comece a carreira certo: CNPJ pronto, sem custo e sem medo de errar na Receita.
```

**Alternates:**
```
[82]  +15.000 médicos já confiam na Caveo. Resolva tudo pelo celular, em poucos minutos.
[79]  Simples e rápido: você só assina e a Caveo resolve toda a parte chata por você.
[76]  Médico não foi formado pra abrir empresa. Deixa essa parte com quem entende.
```

### Caminhos de exibição (≤15)
```
[11]  CNPJ-Medico   /   [9]  Sem-Custo
```
→ exibido como `lp.caveo.com.br/CNPJ-Medico/Sem-Custo`

---

## Estratégia de fixação (pinning)

RSA performa melhor com **pouco pinning** (deixa o Google otimizar combinações), mas controlamos a mensagem essencial:

- **Posição 1 (fixar 2, em rotação):** `Abra seu CNPJ médico de graça` + `Não sabe por onde começar?` → garante que toda impressão lidere com **benefício (grátis)** ou **dor (por onde começar)**.
- **Posição 2/3 (fixar a prova/confiança):** `Plataforma feita por médicos` + `+15.000 médicos já confiam` + `Comece certo. Comece agora.`
- **Demais 10 títulos:** sem fixação — o Google combina simplicidade/facilidade/"trabalho duro" livremente.

> Regra prática: fixe no máximo o necessário para não emitir uma mensagem ruim. Quanto menos pin, mais o algoritmo testa.

---

## Extensões (assets)

**Callouts (≤25):**
```
Abertura sem custo · Sem burocracia · A gente cuida de tudo
Tudo pelo celular · Feito por médicos · +15.000 médicos · Pronto em minutos
```

**Sitelinks (texto ≤25):**
| Texto | Sugestão de descrição (2 linhas ≤35) | Destino |
|---|---|---|
| Abra seu CNPJ grátis | Sem custo, sem burocracia | `lp.caveo.com.br/?...&utm_content=sl_abrir` |
| Como funciona | Tudo pelo celular, em minutos | `...&utm_content=sl_como_funciona` |
| Feito por médicos | Quem entende da sua rotina | `...&utm_content=sl_feito_por_medicos` |
| Fale no WhatsApp | Tire suas dúvidas com a gente | `...&utm_content=sl_whatsapp` |

**Structured snippet** — cabeçalho **"Serviços"**:
```
Abertura de CNPJ · Emissão de notas · Gestão de impostos · Dashboard financeiro · Suporte por médicos
```

---

## Palavras-chave (ad group "CNPJ médico — RF")

Use **correspondência de frase** como base e suba **exatas** para os termos campeões:

```
"abrir cnpj medico"
"como abrir cnpj medico"
"abrir pj medico"
"cnpj para medico recem formado"
"abertura de cnpj para medico"
"abrir empresa medico"
"cnpj plantonista"
"contabilidade para medico"
[abrir cnpj medico gratis]
[como abrir cnpj para medico]
```

**Negativas (evitar intenção fora do funil PJ):**
```
clt, concurso, emprego, vaga, salario, curso, faculdade,
prova residencia, "como ser medico", download, modelo gratis,
mei (avaliar: médico não pode MEI — pode virar termo de objeção, mas comece negativando)
```

---

## Por que essa copy (princípios aplicados)

| Princípio | Como aparece |
|---|---|
| **Atacar a dor emocional, não o sintoma** | "Não sabe por onde começar?" e "O 'e agora?' da formatura" tocam a ansiedade do recém-formado — antes de falar de produto. |
| **Simplicidade / facilidade** | "Sem burocracia nenhuma", "Simples, rápido e sem dor", "Tudo resolvido pelo celular". |
| **A Caveo carrega o peso** | "A gente faz o trabalho duro", "Nós cuidamos de tudo pra você", "Você assina, a Caveo resolve", "Médico não foi formado pra abrir empresa". |
| **Gatilho racional (grátis)** | "de graça", "100% gratuito", "sem custo" — economia >R$1.000 da abertura. |
| **Selo de confiança transversal** | "Feito por médicos" + "+15.000 médicos" (quebra "é seguro abrir por app?"). |
| **Começar certo / sair na frente** | "Comece certo", "CNPJ pronto pro 1º plantão" — o gatilho emocional nº1 do RF. |

> **Compliance:** "grátis/sem custo" refere-se à **abertura do CNPJ** (modelo: a Caveo ganha na mensalidade depois) — manter transparente na LP. Não prometer prazo fixo ("em minutos") sem suporte operacional. Manter LeadSource "LP Turbo" para o funil RF ler certo no Salesforce/dashboard.
</content>
</invoke>
