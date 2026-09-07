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
