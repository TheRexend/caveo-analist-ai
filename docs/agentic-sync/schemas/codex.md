# Formato Codex CLI — referência para tradução

Fonte: pesquisa web (blog de terceiro, abril/2026 — **não é doc oficial
estável**; revisar quando o guardião sinalizar campo desconhecido).

## Arquivo raiz de instruções
- Nome: `AGENTS.md`, na raiz do repo — **compartilhado com Hermes Agent e,
  se configurado, Gemini CLI** (ver `schemas/gemini.md`).
- Formato: Markdown livre.

## Skill
- Local global: `~/.codex/skills/` (mesmo shape mínimo do Claude:
  frontmatter `name`+`description` + corpo).
- Suporte a skill por projeto além de `.agents/skills/` (alias
  documentado pelo Gemini CLI) não confirmado — tratar como best-effort
  até confirmação.

## Agente
- Local por projeto (versionável): `.codex/agents/<nome>.toml`. **Só
  carrega se o projeto for "trusted" pelo Codex CLI** — pré-requisito
  operacional fora do controle deste guardião.
- Local pessoal: `~/.codex/agents/<nome>.toml`.
- Formato TOML:
  ```toml
  name = "agent-name"
  description = "Guidance shown to Codex when choosing which agent to spawn."
  developer_instructions = """
  Corpo do system prompt do agente, em texto multilinha.
  """

  model = "gpt-5.5"
  model_reasoning_effort = "high"
  sandbox_mode = "read-only"

  [mcp_servers.nome-do-servidor]
  command = "npx"
  args = ["-y", "@pacote/servidor-mcp"]
  ```
  - `name`, `description`, `developer_instructions` obrigatórios.
  - `developer_instructions` é o equivalente ao "corpo" do arquivo
    Claude/Gemini.
  - `model`, `model_reasoning_effort` (`low`/`medium`/`high`),
    `sandbox_mode` (`read-only`/`workspace-write`/`danger-full-access`),
    `mcp_servers`, `skills.config` são opcionais.
