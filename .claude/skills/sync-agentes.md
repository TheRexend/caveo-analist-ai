---
name: sync-agentes
description: Reconcilia CLAUDE.md/AGENTS.md, skills e agentes entre Claude Code, Codex, Hermes e Gemini
---

# Skill: sync-agentes

Reconcilia o arquivo de instruções raiz, as skills e os agentes deste
projeto entre as 4 ferramentas de IA instaladas na máquina (Claude Code,
Codex CLI, Hermes Agent, Gemini CLI). Roda **só sob demanda** — nunca em
background, nunca sobrescreve nada sem você aprovar antes.

Ver o design completo em
`docs/superpowers/specs/2026-09-06-sync-multi-ia-design.md`.

## Quando usar

- Você criou ou editou uma skill/agente em `.claude/` nesta sessão (o
  orquestrador já deve ter sugerido isso — ver CLAUDE.md, Papel 2).
- Você editou um agente/skill direto num formato nativo de outra
  ferramenta (ex.: `.gemini/agents/*.md`) e quer que isso volte pro Claude
  e se propague pras demais.
- Você quer só auditar se algo ficou defasado, sem necessariamente aplicar
  nada.

## Antes de rodar

Leia os 4 arquivos de referência de schema — eles são a fonte de verdade
de COMO traduzir, não confie em memória de sessões anteriores (os formatos
de Codex/Gemini são recentes e mudam rápido):

- `docs/agentic-sync/schemas/claude.md`
- `docs/agentic-sync/schemas/codex.md`
- `docs/agentic-sync/schemas/hermes.md`
- `docs/agentic-sync/schemas/gemini.md`

## Procedimento

1. **Rodar o scan de hash:**
   ```bash
   python3 scripts/sync_agentes/cli.py scan
   ```
   Isso não escreve nada — só compara o hash atual de cada lado existente
   com o que está gravado em `docs/agentic-sync/manifest.json` e classifica
   cada artefato como `unchanged`, `propagate` ou `conflict`.

2. **Para cada artefato com status `unchanged`:** ignore, nada a fazer.

3. **Para cada artefato com status `propagate`:**
   - `changed_sides` diz qual lado mudou (é a fonte pra esta rodada).
   - Leia o conteúdo desse lado e o schema de referência de cada lado de
     destino que existir (ou precisar ser criado) para este artefato:
     - `root` → gerar/atualizar `AGENTS.md` a partir de `CLAUDE.md` (ou
       vice-versa, dependendo de qual lado mudou).
     - `skill:<nome>` → gerar/atualizar `.agents/skills/<nome>.md`
       (Codex+Gemini) e `~/.hermes/skills/caveo/<nome>/SKILL.md` (Hermes —
       **avisar explicitamente antes de escrever fora do repo**, ver
       `schemas/hermes.md` pros campos obrigatórios extras).
     - `agent:<nome>` → gerar/atualizar `.gemini/agents/<nome>.md` e
       `.codex/agents/<nome>.toml`; **além disso**, sempre regenerar (não
       rastreado no manifesto) `~/.hermes/skills/caveo/<nome>-delegate/SKILL.md`
       documentando o uso de `delegate_task` equivalente — rotulado como
       aproximação, nunca como paridade real.
   - Mostre um resumo do que vai escrever em cada arquivo (diff, ou
     conteúdo completo se o arquivo for novo) e **espere aprovação
     explícita** antes de escrever.
   - Depois de escrever, rode:
     ```bash
     python3 scripts/sync_agentes/cli.py commit "<artifact_id>"
     ```
     (ex.: `python3 scripts/sync_agentes/cli.py commit "skill:reporte-ga4"`)

4. **Para cada artefato com status `conflict`:**
   - **Nunca decida sozinho.** Mostre o conteúdo de cada lado que mudou
     lado a lado e pergunte ao usuário: manter um lado como verdade (e
     propagar), ou fundir manualmente.
   - Só depois de uma decisão explícita, aplique e rode `commit`.

5. **Checagem de sanidade final:** para cada arquivo escrito nesta rodada,
   confirme que o frontmatter/TOML parseia (YAML válido para
   Claude/Gemini/Hermes, TOML válido para Codex) e que não sobrou nenhum
   placeholder óbvio (ex.: nome de ferramenta errado, caminho tipo
   `.Codex/skills/`). Reporte um resumo final do que mudou em cada lado —
   mesmo espírito do `npm run docs:check` já usado no projeto.

## Pitfalls

- Skills do Hermes são **globais ao usuário**, não por projeto — sempre
  avisar antes de escrever em `~/.hermes/skills/caveo/...` e sempre manter
  o prefixo de categoria `caveo`.
- `.codex/agents/*.toml` só carrega se o projeto for "trusted" pelo Codex
  CLI — fora do controle desta skill.
- Se um arquivo nativo tiver um campo que não está documentado no schema
  de referência da ferramenta, isso é sinal de que o schema mudou — avise
  o usuário em vez de ignorar o campo ou inventar um valor.

## Verificação

- `python3 scripts/sync_agentes/cli.py scan` volta a mostrar `unchanged`
  para todo artefato tratado nesta rodada.
- Nenhum arquivo foi escrito sem aprovação explícita.
- Todo conflito detectado foi resolvido por decisão humana, nunca
  automaticamente.
