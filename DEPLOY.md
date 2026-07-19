# Deploy na Vercel — Caveo Dashboard

Dashboard Next.js (App Router) que cruza Meta Ads + Google Ads + Salesforce.
Pronto para deploy na Vercel. Siga os passos abaixo.

## 1. Storage das metas (Postgres)

O SQLite (`data/goals.db`) funciona só localmente — o filesystem da Vercel é
efêmero. Para produção, crie um Postgres e aponte `POSTGRES_URL`:

- **Supabase**: crie um projeto → Settings → Database → Connection string (URI).
- **Vercel Postgres / Neon**: crie via dashboard da Vercel → copie a `POSTGRES_URL`.

A tabela `monthly_goals` é criada automaticamente na primeira chamada.
O código (`lib/integrations/goals.ts`) usa Postgres quando `POSTGRES_URL`
(ou `DATABASE_URL`) existe; caso contrário, SQLite.

## 2. Variáveis de ambiente

Em **Project Settings → Environment Variables**, configure todas as chaves do
`.env.example` (Production + Preview). Pontos de atenção:

- **Google Ads**: na Vercel não há arquivo de credenciais. Use os três campos
  `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`
  (extraídos do `google_application_credentials.json` local).
- **GA4 (aba Sítio)**: como não há arquivo em produção, o dashboard lê o service
  account de **`GA4_CREDENTIALS_JSON`** (o JSON inteiro, minificado numa linha) +
  **`GA4_PROPERTY_ID`** (`488647966`). Em local, ele usa o arquivo apontado por
  `GA4_CREDENTIALS`. Ordem de resolução em `lib/env.ts`: `GA4_CREDENTIALS_JSON`
  (inline) → `GA4_CREDENTIALS` (arquivo).
- **POSTGRES_URL**: a string do passo 1.

> **Atalho:** `bash scripts/push_env_to_vercel.sh` lê o `.mcp.json` + os arquivos
> de credencial e sobe TODAS as env vars (Meta, Salesforce, Google Ads e GA4 —
> inclusive minifica o service account do GA4 em `GA4_CREDENTIALS_JSON`) para os
> três environments. Requer `vercel` CLI autenticado e o projeto vinculado.

## 3. Configuração do projeto

- **Root Directory**: `./` (raiz) — o app (`app/`, `lib/`, `components/`) está na
  raiz do repositório. ⚠️ Se o projeto na Vercel ainda estiver com Root Directory
  = `dashboard` (config antiga, de quando o app ficava numa subpasta), o build
  vai falhar. Corrija em **Project Settings → General → Root Directory** deixando
  vazio / `./`.
- **Framework Preset**: Next.js (detectado automaticamente)
- **Build Command**: `next build` (padrão)
- **Install Command**: `pnpm install` (padrão)

## 4. Deploy

```bash
# a partir da raiz do projeto
vercel            # primeira vez: linka o projeto
vercel --prod     # publica em produção
```

Ou conecte o repositório no dashboard da Vercel para deploy automático a cada push.

## 5. Verificação pós-deploy

Acesse `https://<seu-dominio>/api/debug` — deve mostrar `ping: ok` para Meta,
`oauth: ok` para Google e `ping: ok` para Salesforce. Se algum falhar, revise a
env var correspondente.

Para a aba GA4: `https://<seu-dominio>/api/ga4?from=YYYY-MM-DD&to=YYYY-MM-DD`
deve retornar JSON com `overview` preenchido e `_mock: false`. Se vier
`_mock: true`, faltam `GA4_CREDENTIALS_JSON` / `GA4_PROPERTY_ID`.
