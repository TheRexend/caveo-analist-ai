# Formato Claude Code — referência para tradução

## Arquivo raiz de instruções
- Nome: `CLAUDE.md`, na raiz do repo.
- Formato: Markdown livre, sem frontmatter obrigatório.
- Lido integralmente pelo Claude Code no início de toda sessão.

## Skill
- Local: `.claude/skills/<nome>.md` (arquivo `.md` único e flat — este
  projeto não usa a variante em pasta `<nome>/SKILL.md`).
- Frontmatter YAML mínimo:
  ```yaml
  ---
  name: skill-name
  description: One-line description shown in skill picker and used for routing decisions
  ---
  ```
  - `name` (obrigatório): identificador, minúsculo, hífens.
  - `description` (obrigatório): usada pelo runtime para decidir quando
    auto-invocar a skill e exibida no `/help`. Sem limite formal de
    caracteres, mas curta o suficiente pra caber no índice de skills.
- Corpo: instruções em Markdown livre, sem estrutura de seção obrigatória.

## Agente
- Local: `.claude/agents/<nome>.md`.
- Frontmatter YAML:
  ```yaml
  ---
  name: agent-name
  description: Quando este agente deve ser acionado; usada pelo roteamento do orquestrador.
  tools: []
  ---
  ```
  - `name`, `description` obrigatórios.
  - `tools` opcional (não usado pelos 5 agentes atuais deste projeto, mas
    suportado pelo Claude Code — lista de tools permitidas; se omitido,
    herda todas).
- Corpo: system prompt completo do agente (identidade, papel, regras,
  contrato de handoff).

## Comando
- Local: `.claude/commands/<nome>.md` — invólucro fino, um por skill.
- Frontmatter: `description` (+ opcional `argument-hint`).
- Corpo padrão: `Invoque a skill \`<nome>\` para esta tarefa. Argumentos do usuário (se houver): $ARGUMENTS`
