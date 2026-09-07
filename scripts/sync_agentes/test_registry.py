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
