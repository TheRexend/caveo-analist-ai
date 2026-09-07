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
