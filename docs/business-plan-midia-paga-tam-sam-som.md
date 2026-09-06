# Business Plan de Mídia Paga — TAM/SAM/SOM · Caveo

**Caveo · Meta Ads & Google Ads · Público Médico (Formando/Médico/Revalida)**
Base de dados: Salesforce (90 dias: 05/05/2026 a 03/08/2026) + Meta Ads + Google Ads + Demografia Médica 2025
Data da análise: 2026-08-03

---

## 1. O framework: TAM, SAM, SOM

| Camada | Pergunta que responde | O que limita |
|---|---|---|
| **TAM** — Total Addressable Market | Quanto esse mercado vale no total, sem concorrência? | Nenhum limite — é o teto teórico |
| **SAM** — Serviceable Addressable Market | Quanto desse universo o modelo da Caveo consegue de fato servir? | Quem precisa de estrutura PJ (plantão/consultório/sociedade) e é alcançável digitalmente |
| **SOM** — Serviceable Obtainable Market | Quanto dá pra capturar num período realista? | Concorrência, eficiência de CAC no leilão de mídia (capacidade de atendimento não é gargalo aqui) |

Cálculo aplicado: **bottom-up** — conta de pessoas reais elegíveis × ticket médio, cruzado com o funil real (Salesforce + Meta/Google), não estimativa top-down de relatório de mercado.

---

## 2. TAM e SAM da Caveo

| Camada | Pessoas | Como foi calculado | Valor em R$/ano |
|---|---|---|---|
| **TAM** | 635.700 médicos ativos no Brasil (2025) | Universo total de médicos em atividade | 635.700 × R$3.000 ≈ **R$1,91 bi/ano** |
| **SAM** | ≈ 275.900 médicos | 43,4% dos médicos ativos fazem ao menos 1 plantão de 12h/semana (proxy conservador de quem precisa de CNPJ/PJ) | 275.900 × R$3.000 ≈ **R$827,7 mi/ano** |

**Por que 43,4%:** o mercado hospitalar hoje praticamente exige CNPJ de quem presta plantão ("pejotização" virou padrão de contratação nos hospitais privados). Esse percentual é um **piso conservador** — médicos com consultório próprio ou sociedade que não fazem plantão também entram no SAM, mas ainda não há segmentação no Salesforce que permita somar essa fatia sem contar gente duas vezes.

**+ ~45 mil novos formandos/ano** entram no funil todo ano, alimentando o TAM de forma contínua (fluxo, não só estoque).

*Fontes de mercado: Demografia Médica 2025 (USP/AMB, via Agência Brasil e CRM-PR); CREMESP (dado de plantão).*

---

## 3. Modelo teórico do negócio (input do cliente)

| Parâmetro | Valor |
|---|---|
| CAC-alvo | R$800 – R$1.000 (ponto médio R$900) |
| Ticket médio | R$3.000/ano (~R$250/mês) |
| Payback teórico | 3–4 meses |
| Capacidade de atendimento | **Não é gargalo** — atendimento operacionalizado via IA |

> Checagem de consistência: R$900 (CAC) ÷ R$250/mês (ticket) ≈ **3,6 meses de payback** — bate com a faixa informada (3–4 meses).

Como capacidade não é limite, o teto de escala do negócio **não é operacional — é a eficiência do CAC no leilão de mídia**. Ou seja: o Business Plan de mídia paga se resume a uma fórmula reversível:

```
Budget mensal necessário = Meta de novos clientes/mês × CAC-alvo (R$900)
MRR novo gerado           = Novos clientes/mês × R$250/mês
```

| Meta de clientes/mês | Budget necessário | MRR novo gerado |
|---|---|---|
| 50 | R$45.000 | R$12.500/mês |
| 100 | R$90.000 | R$25.000/mês |
| 150 | R$135.000 | R$37.500/mês |

*(tabela ilustrativa — substituir pela meta de crescimento real definida com o cliente)*

---

## 4. Situação real — últimos 90 dias (05/05 a 03/08/2026)

| | Meta Ads | Google Ads | Blended (Meta+Google) |
|---|---|---|---|
| Investimento | R$119.046,93 | R$36.851,83 | R$155.898,76 |
| Fechados Ganho no período | 22 | 138 | 160 |
| **CAC real** | 🔴 **R$5.411** | 🟢 **R$267** | 🟡 **R$974** |
| CAC real vs. alvo (R$900) | ~6x acima | ~3,4x abaixo | dentro da faixa |
| Payback real (ticket R$250/mês) | ~21,6 meses | ~1,1 mês | ~3,9 meses |

**Leitura principal:** o CAC blended (R$974) bate quase exato com o alvo teórico (R$900) — à primeira vista pareceria "tudo dentro do esperado". **Mas essa média esconde um desequilíbrio real**: Google parece estar muito abaixo do CAC-alvo, Meta muito acima. A Seção 4.1 mostra que a eficiência de Google não é uniforme — precisa ser lida com uma quebra adicional antes de qualquer decisão de realocação de budget.

> **Metodologia:** CAC = investimento no período ÷ Fechados Ganho no período (modelo de duas datas: fechamento contado por `LastStageChangeDate`, não por data de criação do lead). Isso significa que parte dos 160 fechamentos pode vir de leads gerados antes da janela de 90 dias — é uma leitura operacional do período, não uma coorte fechada.

### 4.1 A campanha Institucional está carregando o CAC "bom" de Google

O CAC de Google (R$267) não é uniforme entre campanhas — a maior parte vem de uma única campanha de busca institucional/de marca:

| | Institucional | Resto do Google | Google total |
|---|---|---|---|
| Investimento (90d) | R$15.701,35 (42,6% do budget Google) | R$21.150,48 | R$36.851,83 |
| Leads criados | 266 | ~155 | 421 |
| Fechados Ganho | **115 (83,3% dos fechamentos do Google)** | 23 | 138 |
| Taxa Lead → Ganho | 43,2% | 14,8% | — |
| **CAC** | 🟢 R$136,53 | 🟡 **R$919,58** | R$267,04 |

**Sem a Institucional, o CAC real de Google é R$919,58** — praticamente no teto do CAC-alvo (R$900–1.000), não confortavelmente abaixo dele. A Institucional converte quase 3x melhor (43,2% vs. 14,8% Lead→Ganho) porque captura busca de marca — gente que já procura a Caveo pelo nome, não demanda nova gerada pela mídia.

**Implicação pra decisão de budget:** ainda vale dizer que Google (mesmo sem a Institucional, a R$919,58) é muito mais eficiente que Meta (R$5.411) — a comparação entre plataformas continua válida. Mas a Institucional tem teto natural de volume (busca de marca não escala só com mais budget); o verdadeiro alavancador de crescimento em Google é o restante das campanhas (cnpj_medico, PMax, etc.), que hoje opera no limite do CAC-alvo, não abaixo dele. Tratar "Google" como uma categoria uniformemente eficiente, pra fins de argumento com o cliente, superestimaria a folga real de eficiência.

*(Nota de metodologia: o cruzamento campanha Google Ads ↔ `UtmCam__c` do Salesforce foi feito por nome — "BOO - [Search] - [Max Conv] - Institucional" é a única campanha ativa com "Institucional" no nome, então o mapeamento para o slug `institucional` é direto; não há um ID de campanha compartilhado entre as duas plataformas.)*

---

## 5. Share estimado vs. SAM

| Métrica | Valor |
|---|---|
| Total histórico de Fechados Ganho (all-time, todos os canais) | **26.364** |
| SAM estimado | 275.900 médicos |
| **Share estimado** | **≈ 9,6%** |

**Limitações conhecidas (sinalizadas, não resolvidas):**
- **Churn desconhecido** — 26.364 é cumulativo desde o início do CRM; não há dado de quantos ainda são clientes ativos hoje. O share de base ativa pode ser menor que 9,6%.
- **Possível contagem duplicada** — se a Caveo cria mais de uma Oportunidade por cliente ao longo do tempo (upsell, renovação), o número de oportunidades ganhas pode superestimar o número de clientes distintos.

---

## 6. Nota sobre qualidade do dado (contexto, não bloqueio)

Nos 90 dias analisados, 85% das oportunidades criadas (6.477 de 7.608) não têm UTM de origem (`UtmSou__c` nulo). **Isso é esperado e normal nesta base** — não é falha de tracking atual:
1. A migração histórica do Pipedrive para o Salesforce trouxe registros sem os campos de UTM preenchidos.
2. O time comercial cria muitas oportunidades manualmente no Salesforce (ex.: lead por telefone/WhatsApp/indicação), que estruturalmente não carregam UTM, independente do canal de origem real.

Por isso, o CAC calculado sobre o subconjunto Meta/Google atribuído (845 oportunidades no período) é tratado como uma leitura razoavelmente confiável da mídia paga — não uma amostra pequena e enviesada.

---

## 7. Próximos passos sugeridos

1. **Investigar a ineficiência de Meta** — diagnóstico de funil por UTM/criativo (`analista-midia-paga-crm`, Modo 2) pra achar onde a perda está concentrada antes de cortar budget.
2. **Testar realocação incremental Meta → Google (não-Institucional)** — em incrementos pequenos, monitorando se o CAC das campanhas de demanda (cnpj_medico, PMax, etc.) se mantém perto de R$920 conforme o volume aumenta. Não projetar a escala com base no CAC blended de Google (R$267) nem no da Institucional isolada (R$136,53) — ambos refletem busca de marca com teto de volume, não demanda nova.
3. **Definir a meta de crescimento com o cliente** (novos clientes/mês) para preencher a tabela da Seção 3 com o número real e chegar ao budget mensal necessário.
4. **Fechar o cálculo de share** com o dado de clientes ativos (não cumulativo) e de deduplicação por cliente, se disponível internamente.

---

## 8. Fontes

**Dados de mercado (externos) — TAM/SAM:**
- [Brasil deve chegar a 635,7 mil médicos em 2025; mulheres são maioria — Agência Brasil](https://agenciabrasil.ebc.com.br/saude/noticia/2025-04/brasil-deve-chegar-6357-mil-medicos-em-2025-mulheres-sao-maioria)
- [Demografia Médica 2025: Brasil amplia densidade nacional de médicos — Grupo MedCof](https://www.grupomedcof.com.br/blog/demografia-medica-2025/)
- [Brasil terá 635 mil médicos até o fim do ano — Estratégia MED](https://med.estrategia.com/portal/noticias/brasil-tera-635-mil-medicos-ate-o-fim-do-ano-confira-os-principais-dados-da-demografia-medica-2025/)
- [Brasil terá mais de 1 milhão de médicos até 2035 — Cetrus](https://educa.cetrus.com.br/carreira-medica-demografia-medica-2025/) *(base para o fluxo de ~45 mil formandos/ano)*
- [Afinal, médico plantonista precisa ter CNPJ? — Afya](https://educacaomedica.afya.com.br/blog/cnpj-para-medico-plantonista) *(dado CREMESP dos 43,4% em plantão + contexto de "pejotização")*

**Contexto competitivo (players digitais no nicho médico, citados como referência, não medidos):**
- [O Guia para Médicos Plantonistas — CNPJ e Abertura de Empresas — GX Med](https://www.gxmed.com.br/guia-para-medicos-plantonistas-cnpj-abertura-de-empresas)
- [Benefícios de abrir CNPJ para médicos plantonistas — Agilize](https://agilize.com.br/artigos/cnpj-para-medicos-plantonistas-beneficios/)

**Dados internos Caveo (levantados em 2026-08-03):**
- **Salesforce** — queries SOQL via MCP (`salesforce-mcp`), regras de canal/estágio/ganho conforme `docs/fundacao-dados.md`: total histórico de Fechados Ganho, funil e fechamentos por canal nos últimos 90 dias (05/05 a 03/08/2026).
- **Meta Ads** — investimento e resultados dos últimos 90 dias via MCP (`meta-ads-mcp`, conta `act_438086148409254`).
- **Google Ads** — investimento dos últimos 90 dias via MCP (`google-ads-mcp`, conta `3921127876`).
- **Modelo teórico do negócio** (CAC-alvo, ticket médio, payback, capacidade de atendimento) — informado diretamente pelo cliente/time Caveo, não é dado de plataforma.
