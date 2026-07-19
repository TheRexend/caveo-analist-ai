# Ad Groups — Campanha `BOO - [MM] [Captura] [Search] - Contabilidade`

> Data: 2026-07-14 · Baseado em `docs/superpowers/specs/2026-07-14-arquitetura-campanhas-google-ads-rf-mm-design.md` (seção 4)
> Fontes de copy: `docs/LP_Teste_AB_Copy_Medico_Maduro_Caveo.md`, `docs/superpowers/specs/2026-06-15-anuncios-medicos-dores-desejos.md`
> Formato: RSA (Responsive Search Ads) — até 15 headlines (≤30 caracteres) e 4 descriptions (≤90 caracteres) por ad group.

**Regras de integridade aplicadas em toda a copy** (herdadas da LP e do doc de criativos):
- Sempre **"até 30%"**, nunca "30%" categórico.
- Nunca atacar o contador atual — reframe como evolução de carreira, não correção de erro.
- Nenhuma alegação de IA no produto (IA é só referência cultural, não usada nesta camada de Search).
- Sem depoimentos/citações fictícias nos anúncios (diferente da LP, onde modelos de depoimento estão sinalizados para substituição — em anúncio, texto tem que ser 100% verificável).
- Cluster de Compliance evita tom oficial/alarmista e palavras-gatilho que já geraram política `GOVERNMENT_DOCUMENTS` na conta (ex.: não usar "Regularize" como CTA).

**Match types**: predominância de frase/exata (mais controle de relevância — a conta já tem histórico de "Relevância pouco clara"); ampliar para broad + Smart Bidding só depois que o volume justificar.

**Landing page recomendada**: `lp2.caveo.com.br` (requalificada para MM, com o mesmo raciocínio de copy). ⚠️ Confirmar se já está no ar antes de apontar os anúncios pra lá — se não estiver, usar `lp.caveo.com.br` como fallback e tratar o descompasso de mensagem como risco conhecido.

---

## Ad Group 1 — Trocar de contador

**Keywords**
- [contador para médico]
- [contabilidade para médico]
- "trocar de contador médico"
- "trocar de contabilidade médica"
- "contabilidade especializada em médicos"
- "melhor contador para médico"
- "contador especialista em médico PJ"

**Headlines**
1. Contador Feito Pra Médico
2. Trocar de Contador Sem Risco
3. Especialista em Médico PJ
4. Migração Assistida Grátis
5. Não é Especialista em Médico
6. A Gente Cuida da Troca
7. Sem Ficar Sem Nota Um Dia
8. +15.000 Médicos Confiam
9. Raio-X Tributário Grátis
10. Sem Taxas Escondidas
11. Feito Por Médicos Pra Médicos
12. Compare Sem Compromisso
13. Contabilidade 100% Médica
14. Trocar Nunca Foi Tão Fácil
15. Fale Com Quem Entende PJ

**Descriptions**
1. Migração assistida: a gente cuida da troca, você não fica sem nota um dia.
2. Especialistas em médico PJ — não é contabilidade genérica, é feita pra você.
3. Raio-X tributário gratuito e sem compromisso. Descubra quanto pode economizar.
4. Até 30% de economia tributária, dentro da lei. Sem taxas escondidas.

---

## Ad Group 2 — Otimização tributária PJ

**Keywords**
- [reduzir imposto médico PJ]
- "planejamento tributário médico"
- "economizar imposto médico PJ"
- "quanto pagar de imposto médico PJ"
- "otimização tributária médico"
- "pagar menos imposto médico"

**Headlines**
1. Até 30% de Economia Fiscal
2. Pague Menos Imposto, Legal
3. Planejamento Tributário PJ
4. Raio-X Tributário Grátis
5. Descubra Quanto Você Perde
6. Otimização 100% Legal
7. Feito Por Médicos Pra Médicos
8. Economia Real, Sem Risco
9. +15.000 Médicos Confiam
10. Diagnóstico Tributário Grátis
11. Não Pague Imposto a Mais
12. Especialista em Médico PJ
13. Clareza no Seu Imposto
14. Sem Compromisso, Só Clareza
15. Veja Quanto Pode Economizar

**Descriptions**
1. Raio-X tributário grátis: veja quanto pode economizar, sem compromisso.
2. Até 30% de economia tributária, dentro da lei. Especialistas em médico PJ.
3. Chega de pagar imposto no escuro. Clareza total em tempo real, todo mês.
4. +15.000 médicos já economizam com a Caveo. Faça seu raio-X gratuito.

---

## Ad Group 3 — Reforma Tributária 2026

**Keywords**
- "reforma tributária médico"
- "reforma tributária 2026 médico PJ"
- "o que muda 2026 imposto médico"
- "impacto reforma tributária médico"
- "reforma tributária PJ médico"

**Headlines**
1. Reforma Tributária 2026
2. Prepare Sua PJ Pra Reforma
3. O Que Muda no Seu Imposto?
4. Veja o Impacto no Seu Caso
5. Raio-X da Reforma, Grátis
6. Não Fique Pra Trás na Reforma
7. Reforma 2026: Fique Por Dentro
8. Revise Sua Estrutura Agora
9. Especialista em Médico PJ
10. Feito Por Médicos Pra Médicos
11. Descubra o Impacto Real
12. Sem Compromisso, Só Clareza
13. +15.000 Médicos Confiam
14. Antecipe-se à Reforma
15. Fale Com Quem Entende PJ

**Descriptions**
1. As regras mudaram. Veja o impacto da reforma no seu caso, sem compromisso.
2. Quem não revisar agora pode pagar mais. Fale com especialistas em médico PJ.
3. Raio-X tributário gratuito, com o impacto da reforma no seu caso específico.
4. Feito por médicos, pra médicos. +15.000 já confiam na Caveo.

> **Nota de validação**: as afirmações sobre a Reforma devem ser conferidas com a equipe contábil da Caveo antes do go-live (mesmo cuidado já sinalizado na spec de LP) — falar de impacto e revisão, nunca de números fechados.

---

## Ad Group 4 — Múltiplas fontes de renda / plantões

**Keywords**
- "declarar imposto de vários plantões"
- "médico com múltiplos CNPJs imposto"
- "juntar renda de clínica e hospital declaração"
- "imposto plantão cooperativa RPA"
- "contabilidade para médico plantonista"
- "gestão financeira múltiplas fontes médico"

**Headlines**
1. Várias Fontes, Um Só Lugar
2. Plantões, Consultório e Mais
3. Organize Suas Fontes de Renda
4. Cooperativa, RPA e Plantão
5. Chega de Colcha de Retalhos
6. Tudo Organizado, Sem Planilha
7. Especialista em Médico PJ
8. Feito Por Médicos Pra Médicos
9. Múltiplas Fontes, Zero Bagunça
10. Raio-X Tributário Grátis
11. Consolide Sua Vida Fiscal
12. +15.000 Médicos Confiam
13. Sem Compromisso, Só Clareza
14. Dashboard em Tempo Real
15. Fale Com Quem Entende PJ

**Descriptions**
1. Plantões, cooperativa, RPA, consultório e sociedade — tudo em um só lugar.
2. Especialistas que entendem sua rotina, não uma contabilidade genérica.
3. Quanto mais fontes de renda, mais imposto evitável aparece. Raio-X grátis.
4. Dashboard em tempo real: veja tudo o que entra e sai, sem planilha.

> Este é o cluster de maior encaixe com o diferencial mais forte do produto (gestão de múltiplas fontes) e o único que hoje não tem nenhum ad group cobrindo — ver seção 4 da spec de arquitetura.

---

## Ad Group 5 — Compliance / notificação

**Keywords**
- "notificação Receita Federal médico"
- "malha fina médico PJ"
- "declaração de imposto de renda médico PJ"
- "erro na declaração imposto médico"
- "situação fiscal médico PJ"

**Headlines**
1. Evite Erros na Declaração
2. Clareza na Sua Vida Fiscal
3. Fique Longe da Malha Fina
4. Raio-X Tributário Grátis
5. Especialista em Médico PJ
6. Revise Sua Situação Fiscal
7. Segurança Fiscal Pro Médico
8. Feito Por Médicos Pra Médicos
9. Sem Compromisso, Só Clareza
10. +15.000 Médicos Confiam
11. Tranquilidade Com Seu Imposto
12. Diagnóstico Fiscal Gratuito
13. Não Deixe Pra Última Hora
14. Fale Com Quem Entende PJ
15. Migração Assistida Grátis

**Descriptions**
1. Especialistas em médico PJ cuidam da sua declaração com precisão e sem sustos.
2. Raio-X tributário gratuito: veja se sua situação fiscal está em dia.
3. Feito por médicos, pra médicos. +15.000 já confiam na Caveo.
4. Migração assistida e sem risco — você não fica sem nota um dia.

> **Cuidado de tom**: este cluster lida com medo/urgência (Receita, malha fina) — manter tom de clareza/cuidado, nunca alarmista ou parecendo comunicação oficial. Evitar palavras como "Regularize" (gatilho de política `GOVERNMENT_DOCUMENTS` já visto na conta).

---

## Extensões (compartilhadas na campanha)

**Sitelinks**: Raio-X Tributário Grátis · Como Funciona · Caveo x Contabilidade Tradicional · Reforma Tributária 2026
**Callouts**: Sem taxas escondidas · Migração assistida · +15.000 médicos · Suporte especializado · Sem compromisso · Feito por médicos
**Snippet estruturado (Serviços)**: Otimização tributária, Emissão de notas fiscais, Dashboard financeiro, Gestão de múltiplas fontes de renda, Migração assistida

## QA antes de subir

- [ ] Conferir contagem exata de caracteres no Google Ads Editor (headlines ≤30, descriptions ≤90) — as contagens acima são estimativas manuais.
- [ ] Confirmar se `lp2.caveo.com.br` está no ar e alinhada com esses hooks antes de apontar o final URL.
- [ ] Validar as afirmações do Ad Group 3 (Reforma Tributária) com a equipe contábil.
- [ ] Aplicar a negativação cruzada definida na spec de arquitetura (seção 4) entre RF e MM.
