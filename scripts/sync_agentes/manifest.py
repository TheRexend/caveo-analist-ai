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
