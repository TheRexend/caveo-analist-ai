# Dashboard — GA4 + Revisão de Arquitetura — Design

> Subprojeto 3 de 5 da reformulação do Caveo Analyst AI.
> Depende do subprojeto 1 (Fundação) e 5 (MCP GA4, só para a camada agêntica).
> Data: 2026-07-16

## Contexto

O dashboard atual (Next.js 16 / React 19) tem um endpoint consolidado
`/api/dashboard` bem desenhado (fan-out paralelo + cache TTL 90s), mas carrega
rotas legadas que já foram substituídas, tem regras de negócio hardcoded em
`lib/integrations/salesforce.ts` (que devem migrar para a fundação), e usa o
filtro de contratante desatualizado (RF/MM). O usuário quer adicionar uma
visão GA4 completa e limpar a arquitetura.

## Estrutura de abas

Dashboard passa a ter duas abas, com o seletor de período + filtros
(plataforma, contratante) compartilhado no topo:
- **Aba 1 — Mídia Paga + Funil** (a atual, revisada).
- **Aba 2 — Sítio / GA4** (nova).

## Aba GA4 (conteúdo)

**Visão geral (site + mídia):**
- Usuários, Sessões, Novos usuários
- Origem do tráfego; Orgânico × Pago; Brand × Non-brand
- Páginas mais acessadas
- Taxa de engajamento; Tempo médio no site; Conversão geral do site
- *Principais jornadas dos usuários* → **fase 2**: a GA4 Data API não expõe
  path exploration de forma trivial; aproximar por sequências de páginas mais
  comuns ou adiar.

**Landing Pages:**
- Tráfego por LP; Conversão por LP; Tempo médio na página; Performance por
  origem do tráfego.

## Melhorias de produto (selecionadas)

- **B — Coorte de fechamento** (vem do subprojeto 1): fechamentos do mês ×
  mês de origem da captação (só Ganho). Componente na aba de Mídia+Funil.
- **C — Ponte GA4 ↔ Salesforce por LP:** comportamento da LP (GA4) lado a
  lado com conversão por LP no Salesforce (`LeadSource` "LP Turbo" / "LP MM").
  Conecta as duas abas.
- **D — Brand × Non-brand no Google pago:** separar campanhas Google de marca
  vs. não-marca na visão de mídia paga (hoje o dashboard soma tudo junto).
- **E — Alertas de anomalia:** sinalizar variações bruscas vs. período
  anterior nos KPIs (o dado de período anterior já é buscado, só não vira
  alerta).

Fora de escopo (avaliadas e não incluídas nesta rodada):
- **A — KPIs com semáforo de meta** (colorir cards contra meta/benchmark).

## Limpeza de arquitetura

- **Remover rotas legadas:** `/api/metrics`, `/api/funnel`, `/api/timeline`,
  `/api/campaigns` — só são alcançadas por funções mortas do `api-client.ts`
  (`fetchMetrics`, `fetchDashboard`, `fetchCampaigns`, não chamadas em lugar
  nenhum). Remover as rotas E essas funções cliente juntas.
  **CORREÇÃO (verificado na varredura de limpeza, subprojeto 6):**
  `/api/opportunities` **NÃO é legado** — está vivo no drill-down do funil
  (`fetchOpportunities` em `components/dashboard.tsx:155`). MANTER.
  Também manter `/api/health`, `/api/debug`, `/api/goals`, `/api/dashboard`.
- **Adotar a fundação:** trocar as constantes hardcoded de canal/estágio/
  contratante em `lib/integrations/salesforce.ts` por import de
  `config/business-rules.ts`.
- **Correção RF/MM:** aplicar o novo `TipCte__c` (Médico → MM; RF = Formando,
  Médico Faculdades; MM = Médico, Revalida). Vem automaticamente ao adotar a
  fundação, mas é chamado à parte por ser mudança de resultado visível.
- **Cache (decisão):** manter o cache em memória (`lib/cache.ts`) por agora.
  Para um dashboard interno de baixo tráfego o custo real é só chamada
  redundante em cold start / entre instâncias, não erro de dado. Migrar para
  persistente (Vercel KV / Upstash Redis) só se houver rate limit de
  Meta/Google ou lentidão percebida.

## Separação dashboard × agentes (arquitetural)

O dashboard **não usa MCP** — chama as APIs direto no servidor, como
`meta.ts`, `google.ts`, `salesforce.ts` já fazem. Portanto:
- A aba GA4 precisa de um novo **`lib/integrations/ga4.ts`** que chama a GA4
  Data API diretamente (server-side).
- O **MCP de GA4** (subprojeto 5) serve à camada agêntica (agente
  `ga4-analise`), não ao dashboard.
- Ambos batem no GA4 por caminhos diferentes — mantém dashboard e agentes
  desacoplados, como definido na fundação.

## Dependências
- Fundação (subprojeto 1): `config/business-rules.ts`.
- GA4 Data API: credenciais/service account com acesso à propriedade GA4 da
  Caveo (a definir na implementação — provável reuso de service account
  Google já existente).
