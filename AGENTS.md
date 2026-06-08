# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Purpose

This project is a dedicated workspace for developing Codex **skills** and **agents** for the Caveo analyst AI context. Skills are markdown-based instruction files that extend Codex's behavior via the `/skill-name` slash command pattern. Agents are sub-agent definitions invoked through the `Agent` tool.

## Skill Format

Skills live in `.Codex/skills/` (project-local) or `~/.Codex/skills/` (global). Each skill is a `.md` file with a YAML frontmatter header followed by the instruction body:

```markdown
---
name: skill-name
description: One-line description shown in skill picker and used for routing decisions
---

Instruction body — what Codex should do when this skill is invoked.
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

- Project-level permissions: `.Codex/settings.local.json`
- Global permissions: `~/.Codex/settings.json`
- The global config has `skill-creator@Codex-plugins-official` enabled — use the `/skill-creator` skill to build and iterate on new skills.
- `Read(//Users/matheus/.Codex/**)` is allowed at project level, enabling skills and settings to be read directly during development.
