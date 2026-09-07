# Formato Gemini CLI — referência para tradução

Fonte: docs oficiais empacotadas localmente em
`@google/gemini-cli/bundle/docs/core/subagents.md` e
`geminicli.com/docs/cli/skills/` (v0.50.0).

## Arquivo raiz de instruções
- Nome padrão: `GEMINI.md`.
- Pode ser reconfigurado em `.gemini/settings.json`:
  ```json
  { "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }
  ```
  Com isso, o Gemini CLI lê o mesmo `AGENTS.md` do Codex/Hermes — evita
  manter um terceiro arquivo raiz redundante. Este projeto usa essa
  configuração (ver `.gemini/settings.json`).

## Skill
- Por projeto: `.gemini/skills/` ou `.agents/skills/` (alias documentado
  de interoperabilidade — usar `.agents/skills/<nome>.md`, mesmo shape
  mínimo do Claude, pra também servir de mirror do Codex).
- Pessoal: `~/.gemini/skills/` ou `~/.agents/skills/`.

## Agente
- Por projeto: `.gemini/agents/<nome>.md` (compartilhado com o time).
- Pessoal: `~/.gemini/agents/<nome>.md`.
- Frontmatter YAML:
  ```yaml
  ---
  name: security-auditor
  description: Specialized in finding security vulnerabilities in code.
  kind: local
  tools:
    - read_file
    - grep_search
  model: gemini-3-flash-preview
  temperature: 0.2
  max_turns: 10
  timeout_mins: 10
  ---
  ```
  - `name`, `description` obrigatórios.
  - `kind`: `local` (default) ou `remote`.
  - `tools`: lista de tools permitidas; aceita wildcards (`*`, `mcp_*`,
    `mcp_<servidor>_*`); se omitido, herda tudo da sessão principal — sem
    isolamento de fato. Documentar isso na tradução quando o agente
    Claude original não restringe tools.
  - `model`, `temperature`, `max_turns`, `timeout_mins` opcionais.
  - Corpo = system prompt do agente (igual ao Claude).
