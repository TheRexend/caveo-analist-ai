# Checagem de Volume de Busca (Keyword Planner) — Design

> Segue o levantamento de temas em
> `docs/superpowers/specs/2026-08-04-temas-keywords-search-medico-design.md`.
> Ali foram definidos ~30 seeds de keyword; aqui desenhamos a capacidade de
> checar volume de busca real pra elas via Google Ads API.
> Data: 2026-08-04

## 1. Objetivo e escopo

Construir uma capacidade **reutilizável** (não só um script de uso único) pra
checar volume médio mensal de busca, nível de concorrência e lance estimado
de qualquer lista de keywords semente, usando o **Keyword Planner** da API do
Google Ads (`KeywordPlanIdeaService.GenerateKeywordIdeas`), e gravar o
resultado numa planilha Google Sheets nova e dedicada.

## 2. Por que não usar o MCP `google-ads-mcp` existente

O MCP conectado (`ads_mcp`, pacote oficial do Google, v0.0.1 — única versão
publicada) só expõe 3 namespaces de tool: `customers`, `search` (GAQL
genérico), `metadata`. `GenerateKeywordIdeas` não é uma consulta GAQL — é um
método de serviço à parte (`KeywordPlanIdeaService`), e essa versão do pacote
não o expõe. A biblioteca oficial `google-ads` (v31.0.0) que o MCP usa por
baixo já vem instalada no venv onde ele roda e já suporta esse serviço — só
não está exposta como tool.

**Onde vive o MCP hoje:** instalado via `pipx` global
(`~/.local/pipx/venvs/google-ads-mcp/`), fora deste repositório — ainda não
migrado pra `mcps/` (dívida já conhecida, subprojeto 5 do
`docs/projeto-mapa.md`: "google-ads/meta-ads/gtm ainda globais"). Editar o
pacote nesse local violaria o princípio já documentado do projeto ("Tudo
local ao projeto") e qualquer `pipx upgrade`/reinstalação apagaria a mudança
sem aviso, sem estar versionada em lugar nenhum.

**Decisão (confirmada com o usuário):** em vez de vendorizar o MCP inteiro
(esforço grande, desproporcional pra essa necessidade agora) ou remendar o
pacote global (frágil, contraria princípio do projeto), a capacidade nasce
como um **script Python local ao projeto**, no mesmo padrão já usado por
`scripts/acompanhamento_diario/`, `scripts/reporte_ka/` e
`scripts/planilha_resultados/`: lógica pura testável separada de I/O fino.

## 3. Sobre precisar (ou não) ativar algo no Google Cloud

`GenerateKeywordIdeas` é parte da **mesma API do Google Ads** já usada hoje
pelas 3 tools do MCP (`search`, `metadata`, `customers`) — não é um produto
separado, não exige novo cadastro nem nova API a habilitar no Google Cloud.
As mesmas 4 credenciais já em uso (developer token, login/target customer id,
JSON da service account) já provam ter acesso real à conta `3921127876` (não
é uma conta de teste), o que implica developer token com acesso além do
nível "somente teste".

**Ponto a favor:** a conta já tem investimento real histórico (R$150 mil+ em
90 dias) — contas com histórico de gasto recebem **volume exato** de busca
do Keyword Planner, não faixa aproximada (limitação que só se aplica a
contas sem gasto).

**Ressalva honesta:** essa expectativa só se confirma 100% na primeira
chamada real. Se faltar algum escopo específico, a API retorna erro
descritivo (não falha silenciosa) — tratado explicitamente (Seção 7).

## 4. Arquitetura e componentes

Novo diretório `scripts/keyword_volume/`:

```
scripts/keyword_volume/
├── seeds_2026-08-04.txt   # as ~30 seeds do spec anterior, uma por linha
├── client.py              # autentica + chama GenerateKeywordIdeas (thin, não testado por unidade)
├── parser.py              # PURO: resposta da API → linhas ordenadas por volume
├── sheet.py                # cria/localiza a planilha dedicada, grava linhas (gspread)
├── run.py                  # CLI: seeds → client → parser → sheet
├── conftest.py
├── test_parser.py           # TDD: formatação/ordenação
└── test_client.py            # TDD: montagem do request (mockado), não a chamada real
```

Segue o mesmo padrão de nomes já usado nos outros diretórios de
`scripts/` (`sheet.py`, `conftest.py`, `test_*.py`).

## 5. Fluxo de dados

1. `run.py` lê `seeds_2026-08-04.txt` (uma keyword semente por linha).
2. `client.py` autentica com `GoogleAdsClient` (developer token + service
   account + login/target customer id) e chama `GenerateKeywordIdeas` com:
   geo = Brasil, idioma = português, rede = **Google Search** (mesmo escopo
   já decidido no spec anterior — sem Search Partners).
3. `parser.py` (puro) recebe a resposta e produz linhas
   `(keyword, volume médio mensal, nível de concorrência, lance mín., lance
   máx.)`, ordenadas por volume decrescente.
4. `sheet.py` grava essas linhas na planilha dedicada (Seção 6).
5. `run.py` imprime um resumo no terminal (top N por volume) e a URL da
   planilha.

Execução: `python3 scripts/keyword_volume/run.py --seeds
scripts/keyword_volume/seeds_2026-08-04.txt` — rodado por mim via Bash
quando solicitado. Não é uma tool nativa chamável sozinha no meio da
conversa (essa foi a troca consciente feita pela abordagem "script", Seção 2
do spec anterior).

## 6. Planilha de destino

**Nova planilha Google Sheets dedicada** (decisão do usuário — separada das
planilhas operacionais existentes como "Resultados Mês Atual" e "Relação de
Leads", que são funil/resultado real, não pesquisa de mercado).

- Criada programaticamente via `gspread` na primeira execução (usa a mesma
  service account já usada por `sheets_credentials.json` nas outras skills).
- **Compartilhada automaticamente** com o e-mail de trabalho do usuário
  (`matheus.moreira@boomer.com.br`, confirmado) com permissão de edição, pra
  aparecer no Google Drive dele sem nenhum passo manual.
- O ID da planilha criada é salvo (`.env.local`, nova variável
  `KEYWORD_VOLUME_SHEET_ID`) pra reuso — próximas execuções gravam na mesma
  planilha (nova aba por data de execução, ex. `2026-08-04`) em vez de criar
  uma nova a cada rodada.
- Colunas da aba: `Keyword | Tema/Ad group candidato | Balde de funil | Volume médio mensal | Concorrência | Lance mín. | Lance máx.`
  — a coluna "Tema/Ad group candidato" e "Balde de funil" vêm do mapeamento
  já feito no spec anterior (Seção 3 daquele documento), não da API.

## 7. Tratamento de erro

- Falha de autenticação ou de quota da API → mensagem de erro clara no
  terminal, execução interrompida (não mascarar com resultado parcial
  silencioso).
- Seed individual rejeitado pela API (ex. termo malformado) → reportado por
  nome no terminal, resto do lote continua normalmente.
- Falha ao compartilhar a planilha (e-mail inválido) → cria a planilha
  mesmo assim e avisa explicitamente que o compartilhamento falhou, com o ID
  pra compartilhamento manual como fallback.

## 8. Testes

- `test_parser.py` — TDD completo: dado um payload de resposta (mockado, no
  formato do SDK), valida ordenação por volume e formatação das colunas.
- `test_client.py` — testa apenas a **montagem do request** (geo, idioma,
  rede, lista de seeds) contra um `GoogleAdsClient` mockado — não faz
  chamada real (custaria quota e exigiria credenciais válidas em CI).
- `sheet.py` não tem teste automatizado de escrita real (mesma decisão já
  aplicada nas outras skills do projeto — grava numa planilha real, não uma
  de teste).

## 9. Credenciais e configuração

- Novas env vars (nomes) adicionadas a `.env.example`:
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`,
  `GOOGLE_ADS_TARGET_CUSTOMER_ID`, `GOOGLE_APPLICATION_CREDENTIALS`,
  `KEYWORD_VOLUME_SHEET_ID` — os 4 primeiros hoje só existem duplicados
  dentro de `.mcp.json`; passam a ter uma fonte única em `.env.local`
  (gitignorado, valores reais) em vez de segredo escondido só no MCP config.
- Reaproveita a mesma service account JSON já referenciada em
  `GOOGLE_APPLICATION_CREDENTIALS` — nenhuma credencial nova a criar.

## 10. Fora de escopo desta rodada

- Agendamento/automação recorrente da checagem (rodar isso periodicamente
  sozinho) — não pedido, fica pra decisão futura.
- Exposição como tool MCP nativa — decisão consciente de não fazer isso
  agora (Seção 2).
- Migração completa do `google-ads-mcp` pra dentro de `mcps/` — dívida já
  conhecida do projeto, não resolvida por este spec.
