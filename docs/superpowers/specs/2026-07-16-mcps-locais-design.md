# MCPs Locais — Design

> Subprojeto 5 de 5 da reformulação do Caveo Analyst AI.
> Serve os subprojetos 2 (agentes) e 4 (skills). Data: 2026-07-16

## Contexto

Os MCPs hoje estão espalhados: alguns no projeto (`salesforce`), outros globais
(`gtm` em `~/.claude/mcps/`, `google-ads`/`meta-ads` em `~/.local/bin`). Há
segredos em texto puro no `.mcp.json` e um MCP `supabase` aparentemente sem uso.
O usuário quer **todos os MCPs rodando localmente neste projeto**, invocados
pelo `.mcp.json` do projeto (project-scoped), sem depender de nada global.

## Princípio

MCPs servem **só a camada agêntica** (agentes/skills). O dashboard nunca usa
MCP — continua com integrações diretas (`lib/integrations/*.ts`). Isso mantém
dois caminhos separados para as mesmas fontes (ex.: GA4 via MCP para o agente,
`ga4.ts` para o dashboard), preservando o desacoplamento definido na fundação.

## Estrutura local unificada

```
mcps/                      ← tudo dentro do projeto
  .venv/                   ← ambiente Python único do projeto p/ os MCPs
  salesforce/server.py     ← movido de .claude/salesforce_mcp_server.py
  gtm/                     ← vendorizado de ~/.claude/mcps/gtm
  ga4/server.py            ← novo
  sheets/server.py         ← novo
```

`.mcp.json` referencia tudo por caminho relativo ao projeto.

## Inventário

### Mantidos, tornados locais
| MCP | Ação | Serve |
|---|---|---|
| `salesforce` | já local (mover p/ `mcps/salesforce/`) | analista, tracking, skills |
| `gtm` | vendorizar de `~/.claude/mcps/gtm` → `mcps/gtm/` | agente tracking-conversoes |
| `google-ads` | instalar pip no `mcps/.venv`; referenciar `./mcps/.venv/bin/google-ads-mcp` | analista, skills |
| `meta-ads` | idem `./mcps/.venv/bin/meta-ads-mcp` | analista, skills |

### Novos (locais)
| MCP | Serve | Build |
|---|---|---|
| `ga4` | agente `ga4-analise` | servidor local no padrão do salesforce/gtm; OU adaptar um MCP GA4 da comunidade para rodar local — decisão na implementação |
| `sheets` | skills de relatório | wrapper sobre a credencial `gspread`/service account que as skills já usam; substitui os scripts Python soltos |

### Exceção — remoto
- **Firecrawl** (Search/Web) para o agente `criativos` pesquisar
  referências/concorrentes. É conector remoto claude.ai — reuso aceito como
  única exceção ao "tudo local".

### Removidos / limpeza
- **`supabase`**: remover do `.mcp.json` após verificar que nenhuma
  skill/agente depende dele (não confundir com o Postgres do dashboard, que é
  independente do MCP).
- **`shadcn`**: MCP de desenvolvimento de UI (via npx) — manter como está
  (ferramenta de build do dashboard, não runtime).

## Segredos

Trocar os literais no `.mcp.json` por referências a variável de ambiente
(`${GOOGLE_ADS_DEVELOPER_TOKEN}`, `${META_ACCESS_TOKEN}`, `${SF_CLIENT_SECRET}`,
etc.). Valores reais em `.env.local` (já gitignored); nomes documentados em
`.env.example`. O `.mcp.json` já está no `.gitignore`, mas isso remove os
segredos de texto puro do arquivo de config e permite compartilhá-lo com
segurança.

## Dependências
- GA4 MCP precisa de credencial com acesso à propriedade GA4 da Caveo
  (provável reuso da service account Google existente).
- Sheets MCP reusa `.claude/sheets_credentials.json` (service account
  `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`).
