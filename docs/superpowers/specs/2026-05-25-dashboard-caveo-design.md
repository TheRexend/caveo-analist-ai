# Design Spec — Dashboard Caveo Analyst AI
**Data:** 2026-05-25  
**Status:** Aprovado para implementação  
**Autor:** Matheus (brainstorming via Claude Code)

---

## 1. Visão Geral

Dashboard web local de performance integrada de mídia paga, conectando Meta Ads, Google Ads e Salesforce em uma única interface operacional de uso diário pelo analista/gestor de tráfego.

**Objetivo principal:** visualizar o funil completo de investimento → lead → oportunidade → fechamento, com acompanhamento de progresso vs metas mensais configuráveis.

**Quem usa:** gestor/analista de tráfego, uso operacional diário.

---

## 2. Stack Técnica

| Camada | Escolha | Justificativa |
|---|---|---|
| Interface | HTML + CSS + Vanilla JS | Sem framework, zero build step, roda com um comando |
| Gráficos | Chart.js (CDN) | Interativo, dual Y-axis, sem instalação |
| Backend | Flask (`server.py`, porta 8765) | Serve o HTML estático E os endpoints `/api/*` — um único processo |
| Banco de metas | SQLite local (`goals.db`) | Sem servidor extra, queries simples, persiste entre sessões |
| API de dados | MCPs existentes no projeto | Meta Ads MCP · Google Ads MCP · Salesforce MCP |
| Dependências Python | `flask`, `sqlite3` (stdlib) | `pip install flask` — único requisito externo |

---

## 3. Arquitetura

```
browser (dashboard.html)
    │
    ├── GET /api/metrics?from=&to=&platform=
    ├── GET /api/campaigns?from=&to=&platform=
    ├── GET /api/funnel?from=&to=&platform=
    ├── GET /api/timeline?from=&to=&granularity=&metrics=
    ├── GET /api/goals?month=
    └── POST /api/goals  { month, metric, value }
            │
        server.py  (Flask ou http.server simples)
            │
            ├── salesforce-mcp  →  leads, oportunidades, funil
            ├── meta-ads-mcp    →  investimento, impressões, cliques, leads Meta
            └── google-ads-mcp  →  investimento, impressões, cliques, leads Google
            │
        goals.db (SQLite)
            └── tabela: monthly_goals (month TEXT, metric TEXT, value REAL)
```

---

## 4. Componentes da Interface

### 4.1 Barra Superior (Top Bar)
- **Filtro de plataforma:** botões `Todas` / `Google Ads` / `Meta Ads` — filtra todos os componentes da página simultaneamente
- **Date range:** dois inputs `<input type="date">` (início e fim) — granularidade diária
- Ao alterar qualquer filtro, todos os componentes abaixo fazem refetch dos dados via API

### 4.2 KPI Grid 3×3

9 cards fixos na ordem abaixo (3 linhas × 3 colunas), fluindo do topo ao fundo do funil:

|  | Coluna 1 | Coluna 2 | Coluna 3 |
|---|---|---|---|
| **Linha 1** | Investimento Total | Volume de Leads / Conversões | Custo por Lead |
| **Linha 2** | Oportunidades | Custo por Oportunidade | Tx de Conv. Oportunidade→Ganho |
| **Linha 3** | Fechamentos (Ganho) | Custo por Fechamento | Oportunidades Perdidas |

**Barra de progresso vs meta mensal** — presente apenas nos 4 cards de volume:
- Investimento Total de Mídia
- Volume de Leads / Conversões
- Oportunidades
- Fechamentos (Ganho)

Os demais 5 cards mostram apenas o valor atual + tag de status (🟢🟡🔴) comparado à meta configurada.

**Configuração de metas:** botão "⚙ Definir Metas do Mês" abre um modal/painel lateral com formulário — um campo por métrica — e salva via `POST /api/goals`. As metas são salvas por mês (chave: `YYYY-MM`).

### 4.3 Funil de Conversão (Visual Interativo)

Fluxo horizontal: **Lead Novo → MQL → SQL → Oportunidade → Fechado Ganho**

- Cada etapa: caixa com nome, contagem e custo unitário da etapa
- Entre etapas: taxa de conversão com semáforo baseado nos benchmarks do agente analista:
  - Lead→MQL: 🟢 >25% · 🟡 10–25% · 🔴 <10%
  - MQL→SQL: 🟢 >30% · 🟡 15–30% · 🔴 <15%
  - SQL→Oport: 🟢 >60% · 🟡 40–60% · 🔴 <40%
  - Oport→Ganho: 🟢 >30% · 🟡 15–30% · 🔴 <15%
- **Oportunidades Perdidas:** ramo descendente saindo da caixa Oportunidade
- Hover em cada caixa: tooltip com detalhes (custo por estágio, % da meta)
- Dados: Salesforce MCP com queries de estágio por período e plataforma (via UTM)

### 4.4 Timeline de Performance

Gráfico de linhas com dual Y-axis (R$ no eixo esquerdo, volumes no eixo direito).

**Controles:**
- `MA 7d` — toggle de média móvel de 7 dias (apenas no modo Diária)
- `Diária` / `Mensal` — granularidade do eixo X
- `☰ Métricas` — dropdown multi-select para escolher quais séries exibir:
  - Investimento (R$) — eixo esquerdo
  - Leads — eixo direito
  - Oportunidades — eixo direito
  - CPL (R$) — eixo esquerdo
  - Fechamentos — eixo direito

Tooltip unificado (modo `index`) mostra todos os valores do ponto sob o cursor.

### 4.5 Tabela de Campanhas

Título: "Campanhas de Mídia Paga" · subtítulo: "N campanhas · período selecionado"

**Toolbar:**
- Campo de busca por nome de campanha (filtro client-side)
- Filtro de plataforma sincronizado com o filtro global do topo

**Colunas (todas ordenáveis por clique no header):**
Plataforma · Campanha · Investimento · Impressões · Cliques · CTR · CPC · Leads · CPL · Oportunidades · Custo por Oportunidade · Fechamentos

**Linha expandível:** clicar em uma campanha expande uma sub-linha com:
- Investimento diário médio no período
- Taxa Lead → Oportunidade
- Taxa Oportunidade → Ganho

**Linha de TOTAL:** rodapé fixo com somatórios e médias ponderadas de todas as campanhas visíveis.

**Badge de plataforma:** pill colorido (verde = Google Ads, azul = Meta Ads).

---

## 5. Sistema de Metas Mensais

### Schema SQLite — `goals.db`

```sql
CREATE TABLE monthly_goals (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    month   TEXT NOT NULL,   -- formato 'YYYY-MM'
    metric  TEXT NOT NULL,   -- slug da métrica (invest, leads, oport, ganho, cpl, cpo, tx_conv, cpf, oport_perdidas)
    value   REAL NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_month_metric ON monthly_goals(month, metric);
```

### Slugs das métricas

| Slug | Métrica | Tipo de meta |
|---|---|---|
| `invest` | Investimento Total | máximo (budget) |
| `leads` | Volume de Leads | mínimo |
| `cpl` | Custo por Lead | máximo |
| `oport` | Oportunidades | mínimo |
| `cpo` | Custo por Oportunidade | máximo |
| `tx_conv` | Tx Conv. Oportunidade→Ganho | mínimo |
| `ganho` | Fechamentos | mínimo |
| `cpf` | Custo por Fechamento | máximo |
| `oport_perdidas` | Oportunidades Perdidas | máximo |

### Modal de configuração de metas
- Abre via botão "⚙ Metas de [Mês/Ano]" no topo da seção KPI
- Um campo numérico por métrica, pré-preenchido com o valor do mês anterior se existir
- Salva via `POST /api/goals` com `{ month: 'YYYY-MM', goals: { slug: value, ... } }`
- Ao salvar, os cards de KPI atualizam as barras de progresso sem recarregar a página

---

## 6. Endpoints da API Local

| Método | Endpoint | Parâmetros | Fonte |
|---|---|---|---|
| GET | `/api/metrics` | `from`, `to`, `platform` | Meta MCP + Google MCP + Salesforce MCP |
| GET | `/api/funnel` | `from`, `to`, `platform` | Salesforce MCP (SOQL por estágio) |
| GET | `/api/campaigns` | `from`, `to`, `platform` | Meta MCP (`get_insights` nível campanha) + Google MCP (GAQL) |
| GET | `/api/timeline` | `from`, `to`, `granularity`, `metrics` | Meta MCP + Google MCP + Salesforce MCP |
| GET | `/api/goals` | `month` | SQLite `goals.db` |
| POST | `/api/goals` | body JSON | SQLite `goals.db` |

---

## 7. Mapeamento de Dados por Fonte

### Meta Ads (`meta-ads-mcp`, conta `act_438086148409254`)
- `get_insights` com `level: campaign`, `fields: spend, impressions, clicks, ctr, cpc, actions(lead)`
- Filtro de campanha `[LEADS]` já definido na skill `reporte-semanal-caveo`

### Google Ads (`google-ads-mcp`, conta `3921127876`)
- GAQL: `SELECT campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr FROM campaign WHERE segments.date BETWEEN ...`
- `cost_micros ÷ 1_000_000` para converter para R$

### Salesforce (`salesforce-mcp`, org `caveo.my.salesforce.com`)
- Leads por UTM e estágio: queries SOQL já documentadas no agente `analista-midia-paga-crm.md`
- Funil: `GROUP BY StageName` em `Opportunity` com filtro de período e UTM source
- Plataforma → UTM mapping já definido no agente (Meta = `facebook%` + `Instagram%` etc.)

---

## 8. Estrutura de Arquivos

```
caveo_analist_ai/
├── dashboard/
│   ├── index.html          ← app principal (single page)
│   ├── server.py           ← API bridge Flask (porta 8765)
│   ├── goals.db            ← SQLite (criado automaticamente)
│   ├── start.sh            ← script: inicia server.py + abre browser
│   └── static/
│       ├── style.css
│       └── app.js
└── docs/superpowers/specs/
    └── 2026-05-25-dashboard-caveo-design.md  ← este arquivo
```

### Inicialização

```bash
# Um comando para subir tudo:
./dashboard/start.sh
# → inicia server.py na porta 8765
# → abre http://localhost:8765 no browser padrão
```

---

## 9. Fora de Escopo (v1)

- Autenticação / controle de acesso
- Deploy em nuvem
- Comparativo de períodos (ex: "vs mês anterior") nos KPI cards
- Drill-down por conjunto de anúncios / grupo de anúncios
- Exportação XLSX / PDF
- Notificações / alertas automáticos
- Histórico de metas (visualização de meses anteriores)
