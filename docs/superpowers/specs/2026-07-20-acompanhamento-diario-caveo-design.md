# Acompanhamento Diário Caveo (MQL/SQL/Fechamentos por segmento) — Design

> Skill de procedimento que preenche a planilha diária de acompanhamento da
> Caveo (investimento, leads, MQL, SQL e fechamentos), por dia e por segmento
> (Médico Maduro / Recém-Formado). Depende da Fundação (`config/business-rules.ts`)
> e do mecanismo de escrita via service account já usado pela `planilha-resultados`.
> Data: 2026-07-20. Nome de trabalho: `acompanhamento-diario-caveo` (ajustável).

## Contexto e problema

Hoje o acompanhamento é manual, diário, numa planilha própria
("CAVEO | Acompanhamento de Resultados"). O usuário precisa, por dia e por
segmento, de: **investimento**, **leads captados**, **MQL**, **SQL** e
**fechamentos**. MQL e SQL são nomenclatura interna da agência (leitura da
liderança) e **ainda não existem na Fundação** — hoje ela só modela grupos de
estágio. Esta skill automatiza a coleta (Meta + Google + Salesforce) e a
gravação nessa planilha.

Não é duplicação da `planilha-resultados` (mensal, por estágio, planilha "Relação
de Leads"). Esta é **diária, por segmento MM/RF, com MQL/SQL**, noutra planilha.
Reaproveita o mecanismo de escrita (service account + gspread) e os filtros de
canal da Fundação.

## Não-objetivos (escopo)

- Não redesenha nem limpa a aba `Banco de Dados` legada da planilha (scaffold
  morto, template e-commerce Pinterest/ROAS). Fica órfã por ora.
- Não alinha o dashboard à nova convenção de rateio institucional (ver "Notas ao
  guardião"). Fica para outro subprojeto.
- Não escreve valores de planejamento (Invest Planejado, Meta Diária) — são
  entrada manual do usuário.
- Não cobre arquivamento de fim de mês da planilha (a aba é "mês atual").

## Alvo de escrita (planilha)

- **Planilha:** `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`
  ("CAVEO | Acompanhamento de Resultados")
- **Aba:** `Resultados Mês Atual`
- **Auth:** service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`,
  credenciais `.claude/sheets_credentials.json`, via `gspread`
  (Python `python3` do sistema já tem `gspread` 6.x).

### Estrutura da aba (três blocos verticais idênticos)

| Bloco | Título | Linhas de dia (dia _d_ → linha) |
|---|---|---|
| TOTAL | L1 | 4–34 (dia _d_ → 3+_d_) — **só fórmulas `=MM+RF`, NÃO tocar** |
| MÉDICO MADURO (MM) | L43 | 46–76 (dia _d_ → 45+_d_) |
| RECÉM FORMADOS (RF) | L85 | 88–118 (dia _d_ → 87+_d_) |

Colunas (iguais nos três blocos): A=dia • **META ADS:** B=Invest Planejado,
C=Invest.(R$), D=Variação(R$), E=LEADS, F=MQL, G=SQL • **GOOGLE ADS:**
H=Invest Planejado, I=Invest.(R$), J=Variação(R$), K=LEADS, L=MQL, M=SQL •
**FECHAMENTO–SALES:** N=Meta Diária, O=Fechamento Diária, P/Q=Variação(%).

### Células que a skill ESCREVE (por dia, nos blocos MM e RF)

| Célula | Métrica |
|---|---|
| C | Invest. Meta (R$) |
| E | Leads Meta (`complete_registration`) |
| F | MQL Meta |
| G | SQL Meta |
| I | Invest. Google (R$) |
| K | Leads Google (conversões) |
| L | MQL Google |
| M | SQL Google |
| O | Fechamento Diária (mídia paga) |

### Células PRESERVADAS (a skill NÃO toca)

- **B, H, N** — fórmulas de planejamento que puxam de colunas fora de tela
  (S/T/AA). Entrada manual do usuário.
- **D, J, P, Q** — fórmulas de Variação/Crescimento (dependem de C/B, I/H, O/N).
- **Bloco TOTAL inteiro** — fórmulas `=MM+RF`, atualiza sozinho.

> As células C/E/I/K hoje contêm fórmulas quebradas apontando para a aba
> `Banco de Dados` legada. A skill **substitui essas fórmulas por valores**.
> F/G/L/M/O estão vazias e recebem valores. As fórmulas D/J (que dependem de C/I)
> permanecem e recomputam corretamente sobre os valores gravados.

## Modelo de dados (por dia × segmento × canal)

| Coluna | Métrica | Fonte | Bucket temporal |
|---|---|---|---|
| C / I | Investimento Meta / Google | Plataforma: Meta `spend` / Google `cost` | dia do gasto |
| E | Leads Meta | Meta `complete_registration` (registro concluído) | dia do gasto |
| K | Leads Google | Google `metrics.conversions` (total) | dia do gasto |
| F / L | MQL Meta / Google | Salesforce: opp que **já atingiu** "Aguardando Resposta" | `CreatedDate` |
| G / M | SQL Meta / Google | Salesforce: opp que **já atingiu** "Proposta Enviada" | `CreatedDate` |
| O | Fechamento Diária | Salesforce: fechamentos Ganho de mídia paga (Meta+Google) do segmento | `LastStageChangeDate` |

Decisões de fonte confirmadas: Leads vêm da **plataforma**; MQL/SQL/Fechamento
do **Salesforce**. Para o Meta, "Leads" = **`complete_registration`** (visão de
conversão), não a ação `lead` crua. Conversões Google = total (com ressalva de
medição historicamente ruidosa — [[project_google_ads_conta_estado]]).

## Atribuição de canal (MQL, SQL, Fechamento)

Usa os filtros da Fundação **mídia paga = `cpc` + cruzamento**
(`cpcExpr`/`cruzExpr`, fuso `-03:00`). O **cruzamento** dá crédito à mídia paga
para opps de medium orgânico que carregam `fbc/fbclid` (→ Meta) ou
`gclid/gbraid` (→ Google). Meta tem prioridade sobre Google em conflito.
Segmento (MM/RF) via `TipCte__c` (`CONTRATANTE_RULES` / `tipcteFilter`).

## MQL/SQL — método "já passou pelo estágio" (cumulativo, via histórico)

Fonte da verdade: **`OpportunityHistory`**. Uma opp conta se **em algum momento**
atingiu o estágio-limiar, mesmo que hoje esteja em Perdido ou já tenha avançado.

- **MQL** = histórico contém transição para "Aguardando Resposta" **OU** qualquer
  estágio posterior (Reunião Agendada, Proposta Enviada) **OU** a opp é Ganho.
- **SQL** = histórico contém "Proposta Enviada" **OU** a opp é Ganho.
- Ganho = `WON_CLAUSE` da Fundação (IsWon OU "Ganho não Identificado").

Como Ganho implica passagem por Proposta, e Proposta implica passagem por
Aguardando Resposta, os conjuntos são cumulativos (SQL ⊆ MQL). MQL/SQL são
contados **por segmento (TipCte) direto** — não sofrem rateio — e bucketizados
por `CreatedDate` (dia de captação da opp).

Estas regras entram na Fundação como `QUALIFICATION_RULES` (ver "Mudanças na
Fundação"), para não hardcodar estágios na skill.

## Atribuição de segmento do investimento e leads de plataforma

Investimento (C/I) e Leads de plataforma (E/K) são somados por dia a partir das
campanhas, classificando cada **campanha × dia**:

- Nome com `[MM]` → 100% MM. Com `[RF]` → 100% RF.
- **Institucional / sem tag de segmento** (ex.: Google "Search Institucional",
  PMax; Meta `[LEADS]` sem `[RF]`/`[MM]`) → **rateio proporcional** entre MM/RF
  pela participação de opps do segmento **naquela campanha** (Salesforce
  `UtmCam__c` = campanha, `TipCte__c` = segmento, opps criadas naquele dia):

  ```
  r_MM = opps_MM / (opps_MM + opps_RF)        # SF, aquela campanha, aquele dia
  invest_MM += spend_campanha × r_MM
  leads_MM  += leads_campanha × r_MM          # idem para RF com r_RF = 1 - r_MM
  ```

  Exemplo (confirmado): campanha institucional com R$1.000 e 10 conversões, 5 de
  MM → r_MM = 0,5 → R$500 para MM.

- **Fallback** (campanha institucional com gasto no dia e **0 opps** no SF):
  **50/50** entre MM e RF (aplicado a investimento **e** leads).

Aplica-se **igual em Meta e Google**. É regra **nova** (não existe no projeto).
Difere da convenção atual do dashboard (ver "Notas ao guardião").

Matching campanha↔SF: `UtmCam__c` normalmente == nome da campanha no Meta; no
Google há mapeamento por nome (reaproveitar o de `planilha-resultados`
Fase 2 / a classificação de `lib/integrations/google.ts`).

## Cadência (idempotente, mês-até-o-dia)

Padrão: **recomputa e reescreve os dias 1..D-1 do mês corrente** a cada execução.
É necessário, não redundante: MQL/SQL/Fechamento de um dia **mudam
retroativamente** (opp captada no dia 3 que chega em Proposta no dia 10 aumenta o
SQL do dia 3). Gravar só D-1 deixaria o passado defasado. Aceita override de data
única ou intervalo.

## Fluxo da skill

1. **Período** — calcula START=dia 1 do mês, END=D-1 (ou override). Informa ao usuário.
2. **Coleta (paralela):**
   - Meta `get_insights` diário (`time_increment=1`, nível campanha): `spend` +
     `complete_registration` por campanha/dia; classifica `[RF]`/`[MM]`/institucional.
   - Google `search_search` com `segments.date` (nível campanha): `cost_micros` +
     `conversions` por campanha/dia; classifica por nome/mapa.
   - Salesforce: opps do período + `OpportunityHistory` (estágios já atingidos);
     canal por `cpcExpr`/`cruzExpr`, segmento por `TipCte__c`. Uma passada
     agregada por dia (não uma query por dia).
3. **Cálculo** por dia × segmento (rateio institucional; MQL/SQL por histórico;
   fechamento por `LastStageChangeDate`).
4. **Preview** no chat: tabelas MM e RF (dias × colunas), marcando qualquer
   institucional caído no fallback 50/50. Pede confirmação explícita.
5. **Gravação** (após confirmação): valores nas células dos blocos MM e RF via
   `batch_update`. TOTAL se atualiza pelas fórmulas.

### Formatação de saída na planilha

- Investimento (C/I): `float` (R$ sem símbolo).
- MQL/SQL/Fechamento (F/G/L/M/O): `int` (contagem SF direta).
- Leads (E/K): rateados podem ser fracionários; **arredondar para inteiro uma vez
  por célula** (após somar todas as campanhas do dia/segmento), para minimizar
  drift.

## Mudanças na Fundação (`config/business-rules.ts`)

1. **`QUALIFICATION_RULES`** — limiares MQL/SQL como conjuntos de estágios "já
   atingidos" (+ `alsoWon`). MQL gate = "Aguardando Resposta"; SQL gate =
   "Proposta Enviada". Ponto único e fácil de ajustar (ex.: se um dia MQL virar
   "Nova").
2. **Regra de rateio de segmento** (institucional → proporcional por opp-share;
   fallback 50/50) — documentada na Fundação para ser fonte única (potencialmente
   reusável por outras skills/dashboard).
3. Rodar `npm run docs:rules` (regenera `docs/fundacao-dados.md`) e
   `npm run docs:check` (verde) — dever de sincronia do guardião.

## Artefatos e organização (padrão do projeto)

- **Skill:** `.claude/skills/acompanhamento-diario-caveo.md` (procedimento; roda
  na raiz/orquestrador; lê a Fundação).
- **Comando:** `.claude/commands/acompanhamento-diario-caveo.md` (invólucro fino
  → invoca a skill).
- **Índice:** atualizar `docs/projeto-mapa.md` (skill nova na seção de skills).

## Casos de borda

- Institucional com gasto e 0 opps → fallback 50/50 (invest + leads).
- Campanha Meta sem nenhuma tag e não-institucional conhecida → tratar como
  institucional (rateio); sinalizar no preview.
- Dia sem gasto mas com opps (MQL/SQL/fechamento) → grava só as colunas SF.
- Conversões Google fracionárias por janela de atribuição → arredondar leads.
- Opp sem `UtmCam__c` → não entra no rateio institucional (mas entra em
  MQL/SQL/fechamento pelo canal/segmento).
- Mês com menos de 31 dias → só grava os dias existentes; linhas extras ficam vazias.

## Notas ao guardião (anti-duplicação / divergências)

- **vs `planilha-resultados`:** não duplica — periodicidade (diária vs mensal),
  eixo (MQL/SQL/segmento vs estágio/campanha) e planilha diferentes. Compartilham
  só o mecanismo de escrita e os filtros de canal da Fundação.
- **Rateio institucional diverge do dashboard:** `lib/integrations/google.ts:14-15`
  conta institucional **cheio em ambos** os segmentos (dupla contagem para
  filtro). Esta skill usa **rateio proporcional** (sem dupla contagem). Alinhar o
  dashboard depois é decisão futura, fora deste escopo.
- MQL/SQL passam a existir na Fundação — outras skills/o dashboard podem
  consumir a mesma definição no futuro.

## Suposições a confirmar na revisão

- Nome da skill `acompanhamento-diario-caveo` (ajustável).
- "Fechamento Diária" (O) = fechamentos de **mídia paga** (Meta+Google) do
  segmento, coluna única (não separa canal). Confirmado.
- A planilha continua com day-rows = dia-do-mês; arquivamento mensal é externo.
