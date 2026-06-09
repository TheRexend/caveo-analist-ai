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
- **POSTGRES_URL**: a string do passo 1.

## 3. Configuração do projeto

- **Root Directory**: `dashboard-next`
- **Framework Preset**: Next.js (detectado automaticamente)
- **Build Command**: `next build` (padrão)
- **Install Command**: `pnpm install` (padrão)

## 4. Deploy

```bash
cd dashboard-next
vercel            # primeira vez: linka o projeto
vercel --prod     # publica em produção
```

Ou conecte o repositório no dashboard da Vercel para deploy automático a cada push.

## 5. Verificação pós-deploy

Acesse `https://<seu-dominio>/api/debug` — deve mostrar `ping: ok` para Meta,
`oauth: ok` para Google e `ping: ok` para Salesforce. Se algum falhar, revise a
env var correspondente.
