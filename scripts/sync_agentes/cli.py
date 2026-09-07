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
