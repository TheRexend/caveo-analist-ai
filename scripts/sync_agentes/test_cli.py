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
