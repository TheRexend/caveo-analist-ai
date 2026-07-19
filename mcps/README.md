# MCPs Locais — Caveo

Todos os MCPs da camada agêntica rodam **localmente neste projeto** (exceto o
Firecrawl, conector remoto usado pelo agente `criativos`). Esta pasta contém os
servidores; a config viva é o `.mcp.json` (project-scoped, gitignored). O alvo
está em `.mcp.json.example`.

> **Estado atual:** o `.mcp.json` em uso ainda aponta para os caminhos globais
> antigos (funcionando). Este diretório + `.mcp.json.example` são a estrutura
> nova, **não destrutiva**. Faça a virada abaixo quando o venv e as credenciais
> estiverem prontos, depois teste com `/mcp`.

## Inventário

| MCP | Pasta | Deps | Credencial |
|---|---|---|---|
| `salesforce-mcp` | `mcps/salesforce/` | nenhuma (stdlib) | env `SF_*` |
| `gtm` | `mcps/gtm/` | `mcps/gtm/requirements.txt` | `mcps/gtm/credentials.json` + `token.json` (copiar do global) |
| `ga4` | `mcps/ga4/` | `mcps/ga4/requirements.txt` | service account → `mcps/ga4_credentials.json` + `GA4_PROPERTY_ID` |
| `sheets` | `mcps/sheets/` | `mcps/sheets/requirements.txt` | reusa `.claude/sheets_credentials.json` |
| `google-ads-mcp` | pip (`google-ads-mcp`) | no venv | `mcps/google_ads_credentials.json` |
| `meta-ads-mcp` | pip (`meta-ads-mcp`) | no venv | env `META_*` |
| Firecrawl | remoto (claude.ai) | — | conector claude.ai |

Removido: `supabase` (sem uso na camada agêntica; o Postgres do dashboard é
independente e continua).

## Setup (uma vez)

### 1. Criar o venv único e instalar tudo
```bash
python3 -m venv mcps/.venv
mcps/.venv/bin/pip install -U pip
mcps/.venv/bin/pip install -r mcps/gtm/requirements.txt \
                           -r mcps/ga4/requirements.txt \
                           -r mcps/sheets/requirements.txt \
                           google-ads-mcp meta-ads-mcp
```

### 2. Credenciais
- **GTM:** copiar `credentials.json` e `token.json` do container atual
  (`~/.claude/mcps/gtm/`) para `mcps/gtm/`.
- **GA4:** baixar o JSON do service account com acesso à propriedade GA4 →
  `mcps/ga4_credentials.json`. Anotar o `GA4_PROPERTY_ID`.
- **Google Ads:** JSON de credenciais → `mcps/google_ads_credentials.json`.
- **Sheets:** já existe em `.claude/sheets_credentials.json` (reusado).
- Todos os `*_credentials.json`, `token.json` e o `.venv/` devem ficar
  **gitignored** (adicionar `mcps/.venv/`, `mcps/**/credentials.json`,
  `mcps/**/token.json`, `mcps/*_credentials.json` ao `.gitignore`).

### 3. Variáveis de ambiente (segredos)
Definir no ambiente (shell profile ou gerenciador) — o `.mcp.json` as expande
via `${VAR}`:
```
SF_INSTANCE_URL, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_ACCESS_TOKEN, SF_REFRESH_TOKEN
META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID
GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_TARGET_CUSTOMER_ID
GA4_PROPERTY_ID
```
(Os valores atuais estão no `.mcp.json` em uso — migre-os para o ambiente.)

### 4. Virar a config
```bash
cp .mcp.json .mcp.json.bak          # backup do que funciona
cp .mcp.json.example .mcp.json      # adotar o alvo (revisar antes)
```
Reiniciar a sessão e testar com `/mcp`. Se algo falhar, restaurar do `.bak`.

## Notas
- `salesforce-mcp` usa só stdlib (`python3`), então funciona mesmo sem o venv.
- Os servidores seguem o mesmo padrão JSON-RPC/stdio (MCP 2024-11-05).
- Dashboard **não** usa MCP — ele tem integrações diretas em `lib/integrations/`.
