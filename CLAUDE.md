# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This project is a dedicated workspace for developing Claude Code **skills** and **agents** for the Caveo analyst AI context. Skills are markdown-based instruction files that extend Claude Code's behavior via the `/skill-name` slash command pattern. Agents are sub-agent definitions invoked through the `Agent` tool.

---

## Orquestrador (comportamento da sessão raiz)

A sessão principal (raiz) atua como **orquestrador** do projeto. Ela tem dois
papéis. Índice vivo do projeto: **`docs/projeto-mapa.md`**. Regras de negócio:
**`docs/fundacao-dados.md`** (gerada de `config/business-rules.ts`).

### Papel 1 — Roteamento e síntese

Modelo **híbrido**: tarefa óbvia/de domínio único vai direto ao especialista;
tarefa ambígua ou que cruza domínios passa pela raiz, que aciona os
subagentes (ferramenta Agent) e entrega **uma resposta única sintetizada**
(resolve contradições, prioriza) — não blocos soltos.

| Sinal na pergunta | Rotear para |
|---|---|
| Performance de mídia, CPL/CPO, atribuição, budget, funil/CRM, gargalo comercial, diagnóstico de qual criativo performa | `analista-midia-paga-crm` |
| Idear conceito/copy de anúncio novo (recebe diagnóstico do analista) | `criativos` |
| Tracking, click IDs, conversões server-side, GTM, reconciliação | `tracking-conversoes` |
| Comportamento no site/LP, sessões, origem GA4, engajamento, jornada | `ga4-analise` |

**HANDOFF:** quando um agente encerra com um bloco `HANDOFF → <agente>`, a raiz
lê o bloco e aciona o agente destino com aquele contexto, depois sintetiza.

### Papel 2 — Guardião de organização

Ao criar/mover arquivos ou mudar regras, a raiz zela por:
1. **Estrutura** — specs em `docs/superpowers/specs/`, agentes em `.claude/agents/`, skills em `.claude/skills/`, comandos em `.claude/commands/`, regras em `config/`. Sinalizar o que fugir do padrão (ver árvore em `docs/projeto-mapa.md`).
2. **Sincronia da fundação** — se `config/business-rules.ts` mudar, rodar `npm run docs:check` (falha = rodar `npm run docs:rules`) e avisar quais skills/agentes referenciam a regra alterada.
3. **Anti-duplicação** — antes de criar algo novo, checar o mapa: "isso já existe em X?". Regras de negócio vivem só na fundação; benchmarks só no agente analista.
4. **Onboarding** — `docs/projeto-mapa.md` é o mapa de "onde está o quê".

## Skill Format

Skills live in `.claude/skills/` (project-local) or `~/.claude/skills/` (global). Each skill is a `.md` file with a YAML frontmatter header followed by the instruction body:

```markdown
---
name: skill-name
description: One-line description shown in skill picker and used for routing decisions
---

Instruction body — what Claude should do when this skill is invoked.
```

- The `description` field is critical: it is used by the runtime to decide when to auto-invoke a skill and what the user sees in `/help`.
- Skill files must be saved before they are available in the session.
- Use the `skill-creator` plugin (already enabled globally) to scaffold and test new skills.

## Agent Pattern

Custom agents are invoked via the `Agent` tool with a `subagent_type` matching a registered agent name. Agent definitions describe capabilities, available tools, and behavioral constraints. When designing agents for this project, document:

1. The agent's scope and trigger conditions
2. Which tools it should and should not use
3. Expected input/output contract

## Permissions & Settings

- Project-level permissions: `.claude/settings.local.json`
- Global permissions: `~/.claude/settings.json`
- The global config has `skill-creator@claude-plugins-official` enabled — use the `/skill-creator` skill to build and iterate on new skills.
- `Read(//Users/matheus/.claude/**)` is allowed at project level, enabling skills and settings to be read directly during development.
