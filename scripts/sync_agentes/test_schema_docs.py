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
