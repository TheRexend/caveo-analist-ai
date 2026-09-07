# Formato Hermes Agent — referência para tradução

## Arquivo raiz de instruções
- Nome: `AGENTS.md` (mesmo arquivo do Codex — Hermes não lê `.hermes.md`,
  esse nome não existe em nenhuma versão do Hermes).
- Nível global: `~/.hermes/SOUL.md` (tom/personalidade da sessão, não
  convenção de projeto — fora do escopo deste guardião).

## Skill
- **Só existe em nível global do usuário**, nunca por projeto:
  `~/.hermes/skills/<categoria>/<nome>/SKILL.md`.
- Sincronizar uma skill deste repo pra cá a torna visível em QUALQUER
  projeto aberto com Hermes — **sempre avisar antes de escrever, sempre
  usar a categoria `caveo`** pra ficar identificável/removível depois.
- Frontmatter YAML (mais rígido que o do Claude):
  ```yaml
  ---
  name: my-skill-name
  description: Concise capability statement, under sixty chars.
  version: 0.1.0
  author: Nome do dono do projeto, Claude Code
  license: MIT
  platforms: [linux, macos, windows]
  metadata:
    hermes:
      tags: [caveo]
      related_skills: []
  ---
  ```
  - `name`, `description` são hard requirements do validador; os demais
    campos são convenção forte de review, não bloqueiam carregamento —
    incluir todos mesmo assim.
  - `description` deve ter ≤ 60 caracteres, terminar em ponto, sem
    palavras de marketing.
  - Corpo segue a ordem (nem toda seção obrigatória): `When to Use` →
    `Prerequisites` → `How to Run` → `Quick Reference` → `Procedure` →
    `Pitfalls` → `Verification`.

## Agente
- **Não existe formato nativo de agente isolado no Hermes.** A única
  primitiva de delegação é a chamada imperativa, em tempo de execução:
  `delegate_task(goal=..., context=..., toolsets=[...], role="leaf")`.
  `personalities` troca a voz da sessão inteira, não isola contexto — não
  é equivalente.
- Tradução: gerar uma skill
  (`~/.hermes/skills/caveo/<nome>-delegate/SKILL.md`) documentando quando
  e como chamar `delegate_task` com `goal`/`context` equivalentes ao
  papel do agente Claude — **sempre rotulado como aproximação, nunca como
  equivalente funcional**. Este artefato é regenerado do zero a cada
  sync, nunca rastreado no manifesto de hash (não há lado nativo pra ele
  divergir).
