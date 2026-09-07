# Guardião Multi-IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que skills, agentes e o arquivo de instruções raiz criados neste projeto (hoje só em formato Claude Code) fiquem disponíveis, com fidelidade razoável, para Codex CLI, Hermes Agent e Gemini CLI — via um mecanismo de reconciliação sob demanda que nunca sobrescreve nada sem aprovação humana.

**Architecture:** Um script Python puro (`scripts/sync_agentes/`) faz só o bookkeeping de hash por artefato/lado (sem entender nenhum schema); uma skill agêntica (`.claude/skills/sync-agentes.md`) lê o relatório do script, traduz o conteúdo usando 4 docs de referência de schema (`docs/agentic-sync/schemas/`) e só escreve depois de aprovação explícita. O orquestrador (CLAUDE.md) passa a sugerir essa skill toda vez que algo novo é criado/editado.

**Tech Stack:** Python 3.9+ stdlib (`hashlib`, `json`, `argparse`, `pathlib`) + PyYAML (já instalado no sistema) para os testes; nenhuma dependência nova. Markdown/YAML/TOML são os formatos de saída (nenhum parser de código pra eles — a tradução é feita pela skill, não por código).

**Spec:** `docs/superpowers/specs/2026-09-06-sync-multi-ia-design.md`

## Global Constraints

- Nunca escrever em nenhum arquivo nativo de outra ferramenta sem aprovação explícita do usuário (spec, Decisão 3).
- Conflito = dois ou mais lados mudaram desde o último sync; nunca resolvido automaticamente, sempre decisão humana (spec, Componente 3 / Decisão 3).
- Escrita em `~/.hermes/skills/` (fora do repo, global ao usuário) sempre avisa antes e usa o prefixo de categoria `caveo` (spec, Riscos).
- Hermes não tem formato nativo de agente isolado — vira skill + template de `delegate_task`, sempre rotulado como aproximação; esse artefato nunca é rastreado no manifesto de hash, porque não existe "lado nativo" pra ele divergir (spec, Escopo/Referência de formatos).
- 3 arquivos-raiz colapsam para 2: `CLAUDE.md` (só Claude Code) e `AGENTS.md` (Codex + Hermes + Gemini, via `.gemini/settings.json`) (spec, Referência de formatos).
- `.codex/agents/*.toml` só carrega se o projeto for "trusted" pelo Codex CLI — pré-requisito operacional fora do controle deste guardião (spec, Riscos).
- Schemas em `docs/agentic-sync/schemas/` podem ficar desatualizados (formatos recentes, mudam rápido) — sinalizar campo desconhecido em vez de ignorar ou inventar (spec, Riscos).

---

### Task 1: Scaffolding — docs de referência de schema + exceção no `.gitignore`

**Files:**
- Create: `docs/agentic-sync/schemas/claude.md`
- Create: `docs/agentic-sync/schemas/codex.md`
- Create: `docs/agentic-sync/schemas/hermes.md`
- Create: `docs/agentic-sync/schemas/gemini.md`
- Create: `docs/agentic-sync/manifest.json`
- Create: `scripts/sync_agentes/conftest.py`
- Create: `scripts/sync_agentes/test_schema_docs.py`
- Modify: `.gitignore` (linha `.agents/` → 4 linhas com exceção)

**Interfaces:**
- Produces: `docs/agentic-sync/schemas/{claude,codex,hermes,gemini}.md` — cada um com pelo menos um bloco fenced ` ```yaml ` (claude/hermes/gemini) ou ` ```toml ` (codex) com um exemplo de frontmatter válido. Tasks seguintes (5, 7, 9) consultam esses arquivos.
- Produces: `docs/agentic-sync/manifest.json` = `{"artifacts": {}}` — lido/escrito pelas Tasks 2-4.

- [ ] **Step 1: Escrever o teste que valida os 4 docs de schema**

```python
# scripts/sync_agentes/conftest.py
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
```

```python
# scripts/sync_agentes/test_schema_docs.py
"""Valida que os 4 docs de referência de schema existem e têm um exemplo parseável."""

import re
import textwrap
from pathlib import Path

import yaml

SCHEMAS_DIR = Path(__file__).resolve().parents[2] / "docs" / "agentic-sync" / "schemas"

YAML_TOOLS = ["claude", "hermes", "gemini"]
TOML_TOOLS = ["codex"]


def _strip_frontmatter_delimiters(block: str) -> str:
    """Se o bloco é frontmatter (```yaml\n---\n...\n---\n```), devolve só o
    miolo — yaml.safe_load rejeita dois marcadores `---` como "documento
    duplo", mas um SKILL.md/agent.md real também nunca manda os delimitadores
    pro parser, só o texto entre eles."""
    lines = block.strip("\n").split("\n")
    if lines and lines[0].strip() == "---" and lines[-1].strip() == "---":
        lines = lines[1:-1]
    return "\n".join(lines)


def _fenced_blocks(text: str, lang: str) -> list:
    pattern = rf"```{lang}\n(.*?)```"
    raw_blocks = [textwrap.dedent(block) for block in re.findall(pattern, text, flags=re.DOTALL)]
    return [_strip_frontmatter_delimiters(block) for block in raw_blocks]


def test_all_schema_files_exist():
    for tool in YAML_TOOLS + TOML_TOOLS:
        path = SCHEMAS_DIR / f"{tool}.md"
        assert path.exists(), f"faltando {path}"


def test_yaml_examples_parse():
    for tool in YAML_TOOLS:
        text = (SCHEMAS_DIR / f"{tool}.md").read_text()
        blocks = _fenced_blocks(text, "yaml")
        assert blocks, f"{tool}.md não tem nenhum bloco yaml"
        for block in blocks:
            yaml.safe_load(block)


def test_toml_example_has_required_fields():
    for tool in TOML_TOOLS:
        text = (SCHEMAS_DIR / f"{tool}.md").read_text()
        blocks = _fenced_blocks(text, "toml")
        assert blocks, f"{tool}.md não tem nenhum bloco toml"
        combined = "\n".join(blocks)
        for field in ("name =", "description =", "developer_instructions"):
            assert field in combined, f"{tool}.md exemplo toml sem campo '{field}'"
```

- [ ] **Step 2: Rodar os testes e confirmar que falham (docs ainda não existem)**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/sync_agentes/test_schema_docs.py -v`
Expected: FAIL em `test_all_schema_files_exist` (arquivos não existem)

- [ ] **Step 3: Escrever `docs/agentic-sync/schemas/claude.md`**

```markdown
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
```

- [ ] **Step 4: Escrever `docs/agentic-sync/schemas/codex.md`**

```markdown
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
```

- [ ] **Step 5: Escrever `docs/agentic-sync/schemas/hermes.md`**

```markdown
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
```

- [ ] **Step 6: Escrever `docs/agentic-sync/schemas/gemini.md`**

```markdown
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
  configuração (ver `.gemini/settings.json`, Task 6 deste plano).

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
```

- [ ] **Step 7: Rodar os testes de novo e confirmar que passam**

Run: `python3 -m pytest scripts/sync_agentes/test_schema_docs.py -v`
Expected: PASS (3 testes)

- [ ] **Step 8: Criar o manifesto vazio**

```json
{
  "artifacts": {}
}
```
Salvar em `docs/agentic-sync/manifest.json`.

- [ ] **Step 9: Ajustar `.gitignore` para versionar os mirrors `.agents/skills/*.md` e `.codex/agents/*.toml`**

Trocar a linha `.agents/` (dentro do bloco "Cruft de workspace e
dependências vendorizadas") por:

```gitignore
.agents/*
!.agents/skills/
.agents/skills/*
!.agents/skills/*.md
```

E a linha `.codex/` pelo mesmo padrão (mesma classe de problema — `.codex/`
inteiro estava marcado como cruft vendorizado, o que também esconderia os
mirrors de agente gerados pela Task 11):

```gitignore
.codex/*
!.codex/agents/
.codex/agents/*
!.codex/agents/*.toml
```

Isso mantém ignorado tudo que é cache de terceiros (`.agents/skills/shadcn/`,
`.agents/skills/supabase/`, etc. — subpastas) e passa a versionar só os
arquivos `.md`/`.toml` que este projeto gera diretamente em
`.agents/skills/` e `.codex/agents/` (nossos mirrors pra Codex/Gemini).

- [ ] **Step 10: Verificar que a exceção funciona**

```bash
mkdir -p .agents/skills/_teste_gitignore
echo "conteudo" > .agents/skills/_teste_gitignore/SKILL.md
echo "conteudo" > .agents/skills/_teste.md
git add .agents/ 2>&1
git status --porcelain | grep _teste
```
Expected: só `.agents/skills/_teste.md` aparece como `A ` (staged);
`.agents/skills/_teste_gitignore/SKILL.md` não aparece.

```bash
git restore --staged .agents/skills/_teste.md
rm -rf .agents/skills/_teste_gitignore .agents/skills/_teste.md
```

- [ ] **Step 11: Commit**

```bash
git add docs/agentic-sync/ scripts/sync_agentes/ .gitignore
git commit -m "docs(sync): schemas de referência das 4 ferramentas + manifesto + exceção no gitignore"
```

---

### Task 2: `manifest.py` — bookkeeping puro de hash

**Files:**
- Create: `scripts/sync_agentes/manifest.py`
- Test: `scripts/sync_agentes/test_manifest.py`

**Interfaces:**
- Consumes: nada (funções puras, só `pathlib.Path` e `dict`/`str`/`None`).
- Produces (usado pela Task 4 — `cli.py`):
  - `compute_hash(path: Path) -> Optional[str]`
  - `load_manifest(manifest_path: Path) -> dict`
  - `save_manifest(manifest_path: Path, data: dict) -> None`
  - `classify_artifact(artifact_id: str, current_hashes: Dict[str, Optional[str]], manifest: dict) -> dict` — retorna `{"status": "unchanged"|"propagate"|"conflict", "changed_sides": [...]}`
  - `commit_artifact(manifest: dict, artifact_id: str, current_hashes: Dict[str, Optional[str]]) -> dict`

- [ ] **Step 1: Escrever os testes (falhando)**

```python
# scripts/sync_agentes/test_manifest.py
from manifest import (
    classify_artifact,
    commit_artifact,
    compute_hash,
    load_manifest,
    save_manifest,
)


def test_compute_hash_missing_file_returns_none(tmp_path):
    assert compute_hash(tmp_path / "nao-existe.md") is None


def test_compute_hash_is_deterministic(tmp_path):
    f = tmp_path / "a.md"
    f.write_text("conteudo fixo")
    assert compute_hash(f) == compute_hash(f)


def test_compute_hash_changes_with_content(tmp_path):
    f = tmp_path / "a.md"
    f.write_text("conteudo 1")
    hash1 = compute_hash(f)
    f.write_text("conteudo 2")
    hash2 = compute_hash(f)
    assert hash1 != hash2


def test_load_manifest_missing_file_returns_empty(tmp_path):
    manifest = load_manifest(tmp_path / "manifest.json")
    assert manifest == {"artifacts": {}}


def test_save_and_load_manifest_roundtrip(tmp_path):
    manifest_path = tmp_path / "sub" / "manifest.json"
    data = {"artifacts": {"skill:foo": {"claude": "abc123"}}}
    save_manifest(manifest_path, data)
    assert load_manifest(manifest_path) == data


def test_classify_unchanged():
    manifest = {"artifacts": {"skill:foo": {"claude": "h1", "hermes": "h2"}}}
    result = classify_artifact("skill:foo", {"claude": "h1", "hermes": "h2"}, manifest)
    assert result == {"status": "unchanged", "changed_sides": []}


def test_classify_propagate_single_side_changed():
    manifest = {"artifacts": {"skill:foo": {"claude": "h1", "hermes": "h2"}}}
    result = classify_artifact("skill:foo", {"claude": "h1-novo", "hermes": "h2"}, manifest)
    assert result["status"] == "propagate"
    assert result["changed_sides"] == ["claude"]


def test_classify_conflict_two_sides_changed():
    manifest = {"artifacts": {"skill:foo": {"claude": "h1", "hermes": "h2"}}}
    result = classify_artifact(
        "skill:foo", {"claude": "h1-novo", "hermes": "h2-novo"}, manifest
    )
    assert result["status"] == "conflict"
    assert set(result["changed_sides"]) == {"claude", "hermes"}


def test_classify_first_sync_single_side_present_is_propagate():
    manifest = {"artifacts": {}}
    result = classify_artifact("skill:foo", {"claude": "h1", "hermes": None}, manifest)
    assert result == {"status": "propagate", "changed_sides": ["claude"]}


def test_classify_first_sync_two_sides_preexisting_is_conflict():
    manifest = {"artifacts": {}}
    result = classify_artifact("skill:foo", {"claude": "h1", "hermes": "h2"}, manifest)
    assert result["status"] == "conflict"


def test_commit_artifact_updates_only_target():
    manifest = {"artifacts": {"skill:bar": {"claude": "keep-me"}}}
    new_manifest = commit_artifact(manifest, "skill:foo", {"claude": "h1", "hermes": "h2"})
    assert new_manifest["artifacts"]["skill:bar"] == {"claude": "keep-me"}
    assert new_manifest["artifacts"]["skill:foo"] == {"claude": "h1", "hermes": "h2"}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/sync_agentes/test_manifest.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'manifest'`

- [ ] **Step 3: Implementar `manifest.py`**

```python
# scripts/sync_agentes/manifest.py
"""Bookkeeping de hash por artefato/lado para o guardião multi-IA.

Funções puras — não sabem nada sobre schema de nenhuma ferramenta, só
comparam bytes de arquivo. A tradução de conteúdo é feita pela skill
`sync-agentes` (agêntica), não por este módulo.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Dict, Optional


def compute_hash(path: Path) -> Optional[str]:
    """sha256 hex do conteúdo de *path*, ou None se o arquivo não existe."""
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_manifest(manifest_path: Path) -> dict:
    """Carrega o manifesto; retorna {"artifacts": {}} se o arquivo não existir."""
    if not manifest_path.exists():
        return {"artifacts": {}}
    return json.loads(manifest_path.read_text())


def save_manifest(manifest_path: Path, data: dict) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")


def classify_artifact(
    artifact_id: str,
    current_hashes: Dict[str, Optional[str]],
    manifest: dict,
) -> dict:
    """Compara os hashes atuais de cada lado com o que está no manifesto.

    Retorna {"status": "unchanged" | "propagate" | "conflict",
             "changed_sides": [...]}.
    - "unchanged": nenhum lado mudou desde o último sync.
    - "propagate": exatamente um lado mudou — os outros devem ser gerados
      a partir dele.
    - "conflict": dois ou mais lados mudaram desde o último sync (ou já
      existiam divergentes antes do primeiro sync) — nunca decidir
      sozinho, sempre pedir revisão humana.
    """
    prior = manifest.get("artifacts", {}).get(artifact_id, {})
    changed_sides = [
        side for side, current_hash in current_hashes.items()
        if prior.get(side) != current_hash
    ]
    if not changed_sides:
        status = "unchanged"
    elif len(changed_sides) == 1:
        status = "propagate"
    else:
        status = "conflict"
    return {"status": status, "changed_sides": changed_sides}


def commit_artifact(
    manifest: dict,
    artifact_id: str,
    current_hashes: Dict[str, Optional[str]],
) -> dict:
    """Retorna um novo manifesto com os hashes de *artifact_id* atualizados."""
    artifacts = dict(manifest.get("artifacts", {}))
    artifacts[artifact_id] = dict(current_hashes)
    return {"artifacts": artifacts}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/sync_agentes/test_manifest.py -v`
Expected: PASS (11 testes)

- [ ] **Step 5: Commit**

```bash
git add scripts/sync_agentes/manifest.py scripts/sync_agentes/test_manifest.py
git commit -m "feat(sync): bookkeeping puro de hash por artefato/lado"
```

---

### Task 3: `registry.py` — onde cada lado de cada artefato mora no disco

**Files:**
- Create: `scripts/sync_agentes/registry.py`
- Test: `scripts/sync_agentes/test_registry.py`

**Interfaces:**
- Consumes: nada além de stdlib.
- Produces (usado pela Task 4):
  - `artifact_sides(artifact_id: str, kind: str, repo_root: Path, home: Path) -> Dict[str, Path]`
  - `enumerate_artifacts(repo_root: Path) -> List[str]` — retorna ids no formato `"root"`, `"skill:<nome>"`, `"agent:<nome>"`.

- [ ] **Step 1: Escrever os testes (falhando)**

```python
# scripts/sync_agentes/test_registry.py
from pathlib import Path

import pytest

from registry import artifact_sides, enumerate_artifacts


def test_artifact_sides_root():
    sides = artifact_sides("root", "root", Path("/repo"), Path("/home/u"))
    assert sides == {
        "claude": Path("/repo/CLAUDE.md"),
        "agents_shared": Path("/repo/AGENTS.md"),
    }


def test_artifact_sides_skill():
    sides = artifact_sides("skill:foo", "skill", Path("/repo"), Path("/home/u"))
    assert sides == {
        "claude": Path("/repo/.claude/skills/foo.md"),
        "codex_gemini": Path("/repo/.agents/skills/foo.md"),
        "hermes": Path("/home/u/.hermes/skills/caveo/foo/SKILL.md"),
    }


def test_artifact_sides_agent():
    sides = artifact_sides("agent:bar", "agent", Path("/repo"), Path("/home/u"))
    assert sides == {
        "claude": Path("/repo/.claude/agents/bar.md"),
        "gemini": Path("/repo/.gemini/agents/bar.md"),
        "codex": Path("/repo/.codex/agents/bar.toml"),
    }


def test_artifact_sides_unknown_kind_raises():
    with pytest.raises(ValueError):
        artifact_sides("x", "unknown", Path("/repo"), Path("/home/u"))


def test_enumerate_artifacts_includes_root_and_files(tmp_path):
    (tmp_path / ".claude" / "skills").mkdir(parents=True)
    (tmp_path / ".claude" / "skills" / "foo.md").write_text("---\nname: foo\n---\n")
    (tmp_path / ".claude" / "skills" / "bar.md").write_text("---\nname: bar\n---\n")
    (tmp_path / ".claude" / "agents").mkdir(parents=True)
    (tmp_path / ".claude" / "agents" / "baz.md").write_text("---\nname: baz\n---\n")

    ids = enumerate_artifacts(tmp_path)

    assert ids == ["root", "skill:bar", "skill:foo", "agent:baz"]


def test_enumerate_artifacts_no_skills_or_agents_dirs(tmp_path):
    assert enumerate_artifacts(tmp_path) == ["root"]
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/sync_agentes/test_registry.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'registry'`

- [ ] **Step 3: Implementar `registry.py`**

```python
# scripts/sync_agentes/registry.py
"""Enumera os artefatos rastreados pelo guardião e onde cada lado mora no disco."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List


def artifact_sides(
    artifact_id: str, kind: str, repo_root: Path, home: Path
) -> Dict[str, Path]:
    """Caminho esperado de cada lado bidirecional rastreado para este artefato.

    Não inclui o byproduct Hermes de agentes (skill+delegate_task) — esse é
    gerado sempre do zero pela skill sync-agentes, nunca comparado por hash
    (não existe "lado nativo" pra ele divergir).
    """
    if kind == "root":
        return {
            "claude": repo_root / "CLAUDE.md",
            "agents_shared": repo_root / "AGENTS.md",
        }
    if kind == "skill":
        name = artifact_id.split(":", 1)[1]
        return {
            "claude": repo_root / ".claude" / "skills" / f"{name}.md",
            "codex_gemini": repo_root / ".agents" / "skills" / f"{name}.md",
            "hermes": home / ".hermes" / "skills" / "caveo" / name / "SKILL.md",
        }
    if kind == "agent":
        name = artifact_id.split(":", 1)[1]
        return {
            "claude": repo_root / ".claude" / "agents" / f"{name}.md",
            "gemini": repo_root / ".gemini" / "agents" / f"{name}.md",
            "codex": repo_root / ".codex" / "agents" / f"{name}.toml",
        }
    raise ValueError(f"kind desconhecido: {kind}")


def enumerate_artifacts(repo_root: Path) -> List[str]:
    """Lista os artifact_id atuais: 'root', 'skill:<nome>', 'agent:<nome>'."""
    ids = ["root"]
    skills_dir = repo_root / ".claude" / "skills"
    if skills_dir.is_dir():
        for path in sorted(skills_dir.glob("*.md")):
            ids.append(f"skill:{path.stem}")
    agents_dir = repo_root / ".claude" / "agents"
    if agents_dir.is_dir():
        for path in sorted(agents_dir.glob("*.md")):
            ids.append(f"agent:{path.stem}")
    return ids
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/sync_agentes/test_registry.py -v`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add scripts/sync_agentes/registry.py scripts/sync_agentes/test_registry.py
git commit -m "feat(sync): registry de onde cada lado de cada artefato mora no disco"
```

---

### Task 4: `cli.py` — comandos `scan` e `commit`

**Files:**
- Create: `scripts/sync_agentes/cli.py`
- Test: `scripts/sync_agentes/test_cli.py`

**Interfaces:**
- Consumes: `manifest.compute_hash/load_manifest/save_manifest/classify_artifact/commit_artifact` (Task 2); `registry.artifact_sides/enumerate_artifacts` (Task 3).
- Produces (usado pela Task 5 — skill `sync-agentes`, via linha de comando):
  - `python3 scripts/sync_agentes/cli.py scan [--repo-root DIR] [--home DIR] [--manifest FILE]` → imprime JSON: lista de `{"artifact_id", "hashes", "status", "changed_sides"}`.
  - `python3 scripts/sync_agentes/cli.py commit <artifact_id> [--repo-root DIR] [--home DIR] [--manifest FILE]` → grava o manifesto atualizado, imprime o manifesto resultante.
  - `run_scan(repo_root: Path, home: Path, manifest_path: Path) -> List[dict]` e `run_commit(artifact_id: str, repo_root: Path, home: Path, manifest_path: Path) -> dict` (funções internas, testadas diretamente).

- [ ] **Step 1: Escrever os testes (falhando)**

```python
# scripts/sync_agentes/test_cli.py
from pathlib import Path

from cli import run_commit, run_scan


def _make_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / ".claude" / "skills").mkdir(parents=True)
    (repo / ".claude" / "skills" / "foo.md").write_text(
        "---\nname: foo\ndescription: teste\n---\ncorpo"
    )
    return repo


def test_scan_first_run_root_unchanged_skill_propagate(tmp_path):
    repo = _make_repo(tmp_path)
    home = tmp_path / "home"
    manifest_path = tmp_path / "manifest.json"

    report = run_scan(repo, home, manifest_path)

    root_entry = next(r for r in report if r["artifact_id"] == "root")
    assert root_entry["status"] == "unchanged"  # CLAUDE.md/AGENTS.md não existem no fixture

    skill_entry = next(r for r in report if r["artifact_id"] == "skill:foo")
    assert skill_entry["status"] == "propagate"
    assert skill_entry["changed_sides"] == ["claude"]


def test_commit_then_scan_is_unchanged(tmp_path):
    repo = _make_repo(tmp_path)
    home = tmp_path / "home"
    manifest_path = tmp_path / "manifest.json"

    run_commit("skill:foo", repo, home, manifest_path)
    report = run_scan(repo, home, manifest_path)

    skill_entry = next(r for r in report if r["artifact_id"] == "skill:foo")
    assert skill_entry["status"] == "unchanged"


def test_edit_after_commit_shows_propagate_again(tmp_path):
    repo = _make_repo(tmp_path)
    home = tmp_path / "home"
    manifest_path = tmp_path / "manifest.json"

    run_commit("skill:foo", repo, home, manifest_path)
    (repo / ".claude" / "skills" / "foo.md").write_text(
        "---\nname: foo\ndescription: mudou\n---\ncorpo novo"
    )
    report = run_scan(repo, home, manifest_path)

    skill_entry = next(r for r in report if r["artifact_id"] == "skill:foo")
    assert skill_entry["status"] == "propagate"
    assert skill_entry["changed_sides"] == ["claude"]


def test_conflict_when_two_sides_created_independently(tmp_path):
    repo = _make_repo(tmp_path)
    home = tmp_path / "home"
    manifest_path = tmp_path / "manifest.json"
    mirror = repo / ".agents" / "skills" / "foo.md"
    mirror.parent.mkdir(parents=True)
    mirror.write_text("versao diferente, criada direto no Codex")

    report = run_scan(repo, home, manifest_path)

    skill_entry = next(r for r in report if r["artifact_id"] == "skill:foo")
    assert skill_entry["status"] == "conflict"
    assert set(skill_entry["changed_sides"]) == {"claude", "codex_gemini"}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/sync_agentes/test_cli.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'cli'`

- [ ] **Step 3: Implementar `cli.py`**

```python
# scripts/sync_agentes/cli.py
"""CLI do guardião multi-IA: bookkeeping de hash, sem tradução de conteúdo.

A skill `sync-agentes` chama este script para saber o que mudou; toda
tradução de schema é feita pela própria skill (agêntica), não aqui.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional

from manifest import (
    classify_artifact,
    commit_artifact,
    compute_hash,
    load_manifest,
    save_manifest,
)
from registry import artifact_sides, enumerate_artifacts

KIND_BY_PREFIX = {"root": "root", "skill": "skill", "agent": "agent"}


def _kind_of(artifact_id: str) -> str:
    prefix = artifact_id.split(":", 1)[0]
    return KIND_BY_PREFIX[prefix]


def _current_hashes(
    artifact_id: str, repo_root: Path, home: Path
) -> Dict[str, Optional[str]]:
    sides = artifact_sides(artifact_id, _kind_of(artifact_id), repo_root, home)
    return {side: compute_hash(path) for side, path in sides.items()}


def run_scan(repo_root: Path, home: Path, manifest_path: Path) -> List[dict]:
    manifest = load_manifest(manifest_path)
    report = []
    for artifact_id in enumerate_artifacts(repo_root):
        current = _current_hashes(artifact_id, repo_root, home)
        classification = classify_artifact(artifact_id, current, manifest)
        report.append({"artifact_id": artifact_id, "hashes": current, **classification})
    return report


def run_commit(artifact_id: str, repo_root: Path, home: Path, manifest_path: Path) -> dict:
    manifest = load_manifest(manifest_path)
    current = _current_hashes(artifact_id, repo_root, home)
    new_manifest = commit_artifact(manifest, artifact_id, current)
    save_manifest(manifest_path, new_manifest)
    return new_manifest


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Bookkeeping de hash do guardião multi-IA")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--home", type=Path, default=Path.home())
    parser.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="default: <repo-root>/docs/agentic-sync/manifest.json",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("scan")
    commit_parser = sub.add_parser("commit")
    commit_parser.add_argument("artifact_id")

    args = parser.parse_args(argv)
    manifest_path = args.manifest or (args.repo_root / "docs" / "agentic-sync" / "manifest.json")

    if args.command == "scan":
        print(json.dumps(run_scan(args.repo_root, args.home, manifest_path), indent=2))
    elif args.command == "commit":
        new_manifest = run_commit(args.artifact_id, args.repo_root, args.home, manifest_path)
        print(json.dumps(new_manifest, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/sync_agentes/test_cli.py -v`
Expected: PASS (4 testes)

- [ ] **Step 5: Rodar a suíte inteira de `scripts/sync_agentes/` uma vez**

Run: `python3 -m pytest scripts/sync_agentes/ -v`
Expected: PASS (todos os testes das Tasks 1-4 juntos)

- [ ] **Step 6: Commit**

```bash
git add scripts/sync_agentes/cli.py scripts/sync_agentes/test_cli.py
git commit -m "feat(sync): CLI scan/commit do guardião multi-IA"
```

---

### Task 5: Skill `.claude/skills/sync-agentes.md`

**Files:**
- Create: `.claude/skills/sync-agentes.md`

**Interfaces:**
- Consumes: `python3 scripts/sync_agentes/cli.py scan` / `commit` (Task 4); `docs/agentic-sync/schemas/*.md` (Task 1).
- Produces: procedimento invocado pelo comando da Task 6 e pelo agente da Task 7.

- [ ] **Step 1: Escrever a skill**

```markdown
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
```

- [ ] **Step 2: Verificação manual do frontmatter**

```bash
python3 -c "
import yaml, re
text = open('.claude/skills/sync-agentes.md').read()
m = re.search(r'^---\n(.*?)\n---\n', text, re.DOTALL)
fm = yaml.safe_load(m.group(1))
assert fm['name'] == 'sync-agentes'
assert 'description' in fm
print('OK:', fm)
"
```
Expected: imprime `OK: {'name': 'sync-agentes', 'description': '...'}`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sync-agentes.md
git commit -m "feat(sync): skill sync-agentes — procedimento de reconciliação multi-IA"
```

---

### Task 6: Comando `.claude/commands/sync-agentes.md`

**Files:**
- Create: `.claude/commands/sync-agentes.md`

**Interfaces:**
- Consumes: skill `sync-agentes` (Task 5).

- [ ] **Step 1: Escrever o comando, seguindo o padrão dos outros 15 comandos do projeto**

```markdown
---
description: Reconcilia CLAUDE.md/AGENTS.md, skills e agentes entre Claude Code, Codex, Hermes e Gemini
---

Invoque a skill `sync-agentes` para esta tarefa. Argumentos do usuário (se houver): $ARGUMENTS
```

- [ ] **Step 2: Verificar consistência com um comando existente**

```bash
diff <(head -1 .claude/commands/sync-agentes.md) <(head -1 .claude/commands/acompanhamento-diario-caveo.md)
```
Expected: sem diferença (ambos começam com `---`)

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/sync-agentes.md
git commit -m "feat(sync): comando /sync-agentes"
```

---

### Task 7: Agente `.claude/agents/guardiao-multi-ia.md`

**Files:**
- Create: `.claude/agents/guardiao-multi-ia.md`

**Interfaces:**
- Consumes: skill `sync-agentes` (Task 5).
- Produces: persona acionável pelo orquestrador (Task 8 referencia este agente).

- [ ] **Step 1: Escrever o agente**

```markdown
---
name: guardiao-multi-ia
description: Aciona a reconciliação entre Claude Code, Codex, Hermes e Gemini quando uma skill, agente ou regra de orquestração é criada ou editada. Executa a skill sync-agentes; nunca sobrescreve nenhum lado sem aprovação explícita, e nunca decide sozinho um conflito (dois lados mudados desde o último sync).
---

# AGENTE: Guardião Multi-IA — Caveo Analyst AI

## IDENTIDADE E PAPEL

Você garante que o que existe em `.claude/` (skills, agentes, `CLAUDE.md`)
não fique defasado em relação às outras 3 ferramentas de IA usadas no
projeto: Codex CLI, Hermes Agent e Gemini CLI. Você não é o autor do
conteúdo — é quem detecta divergência e traduz, sempre com aprovação
humana antes de escrever qualquer arquivo.

## QUANDO É ACIONADO

- O orquestrador (CLAUDE.md, Papel 2) sugere rodar você toda vez que uma
  skill, agente ou regra de orquestração é criada/editada na sessão.
- Chamado diretamente via skill/comando `sync-agentes`.

## O QUE VOCÊ FAZ

Executa o procedimento descrito em `.claude/skills/sync-agentes.md`
(rodar o scan de hash via `scripts/sync_agentes/cli.py`, traduzir usando
os schemas em `docs/agentic-sync/schemas/`, mostrar resumo, esperar
aprovação, aplicar, commitar o manifesto).

## O QUE VOCÊ NÃO FAZ

- Não decide sozinho um conflito (dois lados mudados desde o último
  sync) — sempre mostra os dois lados e pergunta.
- Não escreve em `~/.hermes/skills/` sem avisar explicitamente que isso é
  global ao usuário, fora do repo.
- Não inventa conteúdo de negócio novo — só traduz o que já existe de um
  lado pros outros.
```

- [ ] **Step 2: Verificação manual do frontmatter**

```bash
python3 -c "
import yaml, re
text = open('.claude/agents/guardiao-multi-ia.md').read()
m = re.search(r'^---\n(.*?)\n---\n', text, re.DOTALL)
fm = yaml.safe_load(m.group(1))
assert fm['name'] == 'guardiao-multi-ia'
assert 'description' in fm
print('OK:', fm['name'])
"
```
Expected: imprime `OK: guardiao-multi-ia`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/guardiao-multi-ia.md
git commit -m "feat(sync): agente guardiao-multi-ia"
```

---

### Task 8: Atualizar `CLAUDE.md` — orquestrador sugere `/sync-agentes`

**Files:**
- Modify: `CLAUDE.md` (seção "Papel 2 — Guardião de organização")

**Interfaces:**
- Consumes: comando `/sync-agentes` (Task 6).

- [ ] **Step 1: Editar a seção "Papel 2 — Guardião de organização"**

Trocar:
```markdown
### Papel 2 — Guardião de organização

Ao criar/mover arquivos ou mudar regras, a raiz zela por:
1. **Estrutura** — specs em `docs/superpowers/specs/`, agentes em `.claude/agents/`, skills em `.claude/skills/`, comandos em `.claude/commands/`, regras em `config/`. Sinalizar o que fugir do padrão (ver árvore em `docs/projeto-mapa.md`).
2. **Sincronia da fundação** — se `config/business-rules.ts` mudar, rodar `npm run docs:check` (falha = rodar `npm run docs:rules`) e avisar quais skills/agentes referenciam a regra alterada.
3. **Anti-duplicação** — antes de criar algo novo, checar o mapa: "isso já existe em X?". Regras de negócio vivem só na fundação; benchmarks só no agente analista.
4. **Onboarding** — `docs/projeto-mapa.md` é o mapa de "onde está o quê".
```

Por:
```markdown
### Papel 2 — Guardião de organização

Ao criar/mover arquivos ou mudar regras, a raiz zela por:
1. **Estrutura** — specs em `docs/superpowers/specs/`, agentes em `.claude/agents/`, skills em `.claude/skills/`, comandos em `.claude/commands/`, regras em `config/`. Sinalizar o que fugir do padrão (ver árvore em `docs/projeto-mapa.md`).
2. **Sincronia da fundação** — se `config/business-rules.ts` mudar, rodar `npm run docs:check` (falha = rodar `npm run docs:rules`) e avisar quais skills/agentes referenciam a regra alterada.
3. **Sincronia multi-IA** — toda skill, agente ou regra de orquestração criado ou editado nesta sessão: sugerir rodar `/sync-agentes` antes de encerrar (ver `docs/agentic-sync/` e `.claude/skills/sync-agentes.md`). A sugestão é automática; a execução exige aprovação explícita e nunca sobrescreve sozinha em caso de conflito.
4. **Anti-duplicação** — antes de criar algo novo, checar o mapa: "isso já existe em X?". Regras de negócio vivem só na fundação; benchmarks só no agente analista.
5. **Onboarding** — `docs/projeto-mapa.md` é o mapa de "onde está o quê".
```

- [ ] **Step 2: Verificar**

```bash
grep -n "Sincronia multi-IA" CLAUDE.md
```
Expected: 1 linha encontrada

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): orquestrador passa a sugerir /sync-agentes a cada criação"
```

---

### Task 9: Reescrever `AGENTS.md`

**Files:**
- Modify: `AGENTS.md` (reescrita completa)

**Interfaces:**
- Consumes: conteúdo atual de `CLAUDE.md` (pós Task 8); `docs/agentic-sync/schemas/{codex,hermes,gemini}.md` (Task 1).

- [ ] **Step 1: Substituir todo o conteúdo de `AGENTS.md`**

```markdown
# AGENTS.md

Instruções de projeto para Codex CLI, Hermes Agent e Gemini CLI (os 3 lêem
este arquivo — ver `docs/agentic-sync/schemas/gemini.md` sobre como o
Gemini CLI foi configurado pra isso). A versão Claude Code equivalente é
`CLAUDE.md`; qualquer mudança em um dos dois deve ser propagada via
`/sync-agentes` (skill `.claude/skills/sync-agentes.md`).

## Propósito

Workspace dedicado a desenvolver skills e agentes de IA para o contexto de
análise de mídia paga/CRM/tracking/GA4 da Caveo. Índice vivo do projeto:
`docs/projeto-mapa.md`. Regras de negócio: `docs/fundacao-dados.md`
(gerada de `config/business-rules.ts`).

## Papel do agente orquestrador (sessão raiz)

A sessão principal atua como orquestrador: tarefa óbvia/de domínio único
vai direto ao especialista; tarefa ambígua ou que cruza domínios aciona
os agentes especializados abaixo e entrega uma resposta única sintetizada
(resolve contradições, prioriza) — não blocos soltos.

| Sinal na pergunta | Agente especializado |
|---|---|
| Performance de mídia, CPL/CPO, atribuição, budget, funil/CRM, gargalo comercial, diagnóstico de qual criativo performa | `analista-midia-paga-crm` |
| Julgar criativo pelo framework de teste (hook/hold/CTR/CPA), decidir escalar/iterar/matar, hipótese de teste | `analista-criativo` |
| Idear conceito/copy de anúncio novo (recebe diagnóstico do analista) | `criativos` |
| Tracking, click IDs, conversões server-side, GTM, reconciliação | `tracking-conversoes` |
| Comportamento no site/LP, sessões, origem GA4, engajamento, jornada | `ga4-analise` |

Cada agente tem uma definição equivalente nos 4 formatos (Claude Code:
`.claude/agents/<nome>.md`; Gemini CLI: `.gemini/agents/<nome>.md`; Codex
CLI: `.codex/agents/<nome>.toml`; Hermes: skill + template de
`delegate_task`, aproximação documentada, sem paridade real — ver
`docs/agentic-sync/schemas/hermes.md`).

Quando um agente encerra com um bloco `HANDOFF → <agente>`, o orquestrador
lê o bloco e aciona o agente destino com aquele contexto, depois sintetiza.

## Guardião de organização

Ao criar/mover arquivos ou mudar regras, o orquestrador zela por:
1. **Estrutura** — specs em `docs/superpowers/specs/`, agentes em
   `.claude/agents/` (+ espelhos por ferramenta), skills em
   `.claude/skills/` (+ espelhos em `.agents/skills/` e Hermes), regras em
   `config/`.
2. **Sincronia da fundação** — se `config/business-rules.ts` mudar, rodar
   `npm run docs:check` (falha = rodar `npm run docs:rules`).
3. **Sincronia multi-IA** — toda skill/agente/regra criado ou editado
   deve ser propagado às outras ferramentas via `/sync-agentes` antes de
   encerrar a sessão — nunca aplicado sozinho, sempre com aprovação.
4. **Anti-duplicação** — antes de criar algo novo, checar
   `docs/projeto-mapa.md`: "isso já existe em X?".

## Skills e agentes disponíveis

Ver `docs/projeto-mapa.md` para a lista completa e atualizada de skills e
agentes. Este arquivo não duplica a lista — ela muda com frequência e o
`sync-agentes` garante que o espelho aqui reflete o que está em `.claude/`.
```

- [ ] **Step 2: Verificar que o conteúdo antigo/quebrado sumiu e o novo bate**

```bash
! grep -q "Codex.ai/code" AGENTS.md && echo "OK: placeholder antigo sumiu"
! grep -q "\.Codex/skills" AGENTS.md && echo "OK: erro de find-replace sumiu"
grep -q "analista-midia-paga-crm" AGENTS.md && echo "OK: menciona os agentes reais"
grep -q "docs/projeto-mapa.md" AGENTS.md && echo "OK: referencia o mapa"
grep -q "sync-agentes" AGENTS.md && echo "OK: referencia o guardião"
```
Expected: as 5 linhas `OK: ...` impressas

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): reescreve AGENTS.md para refletir o CLAUDE.md atual (era cópia desatualizada)"
```

---

### Task 10: Configurar `.gemini/settings.json`

**Files:**
- Create: `.gemini/settings.json`

**Interfaces:**
- Produces: Gemini CLI passa a ler `AGENTS.md` além de `GEMINI.md` neste projeto.

- [ ] **Step 1: Criar o arquivo**

```json
{
  "context": {
    "fileName": ["AGENTS.md", "GEMINI.md"]
  }
}
```

- [ ] **Step 2: Verificar que é JSON válido e tem a chave certa**

```bash
python3 -c "
import json
data = json.load(open('.gemini/settings.json'))
assert data['context']['fileName'] == ['AGENTS.md', 'GEMINI.md']
print('OK')
"
```
Expected: imprime `OK`

- [ ] **Step 3: Commit**

```bash
git add .gemini/settings.json
git commit -m "feat(sync): configura Gemini CLI para ler AGENTS.md deste projeto"
```

---

### Task 11: Sync de ponta a ponta em 1 skill e 1 agente reais

**Files:**
- Create: `.agents/skills/reporte-ga4.md`
- Create: `.gemini/agents/ga4-analise.md`
- Create: `.codex/agents/ga4-analise.toml`
- Modify: `docs/agentic-sync/manifest.json` (via `cli.py commit`)

**Interfaces:**
- Consumes: skill `sync-agentes` (Task 5), `cli.py scan`/`commit` (Task 4), conteúdo real de `.claude/skills/reporte-ga4.md` e `.claude/agents/ga4-analise.md`.

Este task prova que o sistema construído nas Tasks 1-10 funciona de ponta
a ponta contra o repo real — escolhendo 1 skill (`reporte-ga4`) e 1 agente
(`ga4-analise`) já existentes.

- [ ] **Step 1: Rodar o scan real e confirmar que cobre todo o registry atual**

```bash
python3 scripts/sync_agentes/cli.py scan > /tmp/scan-report.json
python3 -c "
import json
report = json.load(open('/tmp/scan-report.json'))
# 1 root + 17 skills + 6 agents — inclui a sync-agentes/guardiao-multi-ia
# criadas nas Tasks 5 e 7 deste mesmo plano.
assert len(report) == 24, f'esperado 24 artefatos, veio {len(report)}'
print('OK: scan cobre os 24 artefatos existentes sem erro')
"
python3 -c "
import json
report = json.load(open('/tmp/scan-report.json'))
for entry in report:
    if entry['artifact_id'] in ('skill:reporte-ga4', 'agent:ga4-analise'):
        print(entry['artifact_id'], entry['status'], entry['changed_sides'])
"
```
Expected: `OK: scan cobre os 22 artefatos existentes sem erro`, e entradas
`"artifact_id": "skill:reporte-ga4"` e `"artifact_id": "agent:ga4-analise"`,
ambas com `"status": "propagate"` e `"changed_sides": ["claude"]` (mirrors
ainda não existem). Os outros 20 artefatos também aparecem no relatório
(a maioria em `propagate`, já que nenhum mirror existe ainda) — eles ficam
como estão, sem serem traduzidos nesta rodada (ver "Follow-up").

- [ ] **Step 2: Ler os arquivos-fonte**

```bash
cat .claude/skills/reporte-ga4.md
cat .claude/agents/ga4-analise.md
```

- [ ] **Step 3: Seguir o procedimento da skill `sync-agentes` (Task 5) manualmente**

Usando os schemas de `docs/agentic-sync/schemas/gemini.md` e
`docs/agentic-sync/schemas/codex.md`, traduzir o conteúdo lido no Step 2
para:
- `.agents/skills/reporte-ga4.md` (mesmo shape mínimo `name`+`description`+corpo do Claude)
- `.gemini/agents/ga4-analise.md` (frontmatter `name`, `description`, corpo = system prompt; sem `tools` explícito, já que o agente Claude original não restringe)
- `.codex/agents/ga4-analise.toml` (`name`, `description`, `developer_instructions` = corpo)

Mostrar o conteúdo completo de cada um antes de escrever (são arquivos
novos — aprovação = revisar e confirmar).

- [ ] **Step 4: Validar sintaxe de cada arquivo gerado**

```bash
python3 -c "
import yaml, re
for f in ['.agents/skills/reporte-ga4.md', '.gemini/agents/ga4-analise.md']:
    text = open(f).read()
    m = re.search(r'^---\n(.*?)\n---\n', text, re.DOTALL)
    fm = yaml.safe_load(m.group(1))
    assert 'name' in fm and 'description' in fm, f
    print('OK yaml:', f)
"
```
Expected: `OK yaml: .agents/skills/reporte-ga4.md` e `OK yaml:
.gemini/agents/ga4-analise.md`

Para o TOML (sem dependência nova instalada — checagem por texto):
```bash
grep -q "^name = " .codex/agents/ga4-analise.toml && \
grep -q "^description = " .codex/agents/ga4-analise.toml && \
grep -q "developer_instructions" .codex/agents/ga4-analise.toml && \
echo "OK toml: .codex/agents/ga4-analise.toml"
```
Expected: `OK toml: .codex/agents/ga4-analise.toml`

- [ ] **Step 5: Commitar os 2 artefatos no manifesto**

```bash
python3 scripts/sync_agentes/cli.py commit "skill:reporte-ga4"
python3 scripts/sync_agentes/cli.py commit "agent:ga4-analise"
```

- [ ] **Step 6: Confirmar que um novo scan mostra `unchanged` pros 2**

```bash
python3 scripts/sync_agentes/cli.py scan > /tmp/scan-report-2.json
python3 -c "
import json
report = json.load(open('/tmp/scan-report-2.json'))
by_id = {e['artifact_id']: e for e in report}
assert by_id['skill:reporte-ga4']['status'] == 'unchanged'
assert by_id['agent:ga4-analise']['status'] == 'unchanged'
print('OK: os 2 artefatos ficaram unchanged após o commit')
"
```
Expected: `OK: os 2 artefatos ficaram unchanged após o commit`

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/reporte-ga4.md .gemini/agents/ga4-analise.md .codex/agents/ga4-analise.toml docs/agentic-sync/manifest.json
git commit -m "chore(sync): primeira reconciliação real — reporte-ga4 (skill) + ga4-analise (agent)"
```

---

## Follow-up (fora deste plano)

- Migrar as outras 19 skills e 4 agentes restantes: rodar `/sync-agentes`
  quando cada um for tocado de novo, não em lote agora (evita gerar 23
  arquivos que ninguém revisou de verdade).
- Revisar `docs/agentic-sync/schemas/codex.md` quando o Codex CLI publicar
  documentação oficial estável (a fonte usada é um blog de terceiro).
- Confirmar se `.codex/agents/` precisa de algum passo de "trust" manual
  neste projeto especificamente (não testado nesta sessão, Codex não
  estava disponível como binário no PATH).
