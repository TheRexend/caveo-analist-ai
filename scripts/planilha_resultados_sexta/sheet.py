"""Layout da aba "Banco de dados - Inside Sales" (skill planilha-resultados-sexta).

Diferente de scripts/dados_lp/sheet.py: aqui a linha é o DIA-DO-MÊS (1-31),
fixo por bloco — não uma data absoluta que cresce sem fim. O bloco "meta"
(Meta Ads Awareness + Demais Campanhas + GA4) ocupa as linhas 3-33; o bloco
"google" (Search + PMax + DGen) ocupa as linhas 38-68. As mesmas 31 linhas
são recicladas todo mês — não há lógica de "criar linha nova" aqui.
"""

FIRST_ROW = {"meta": 3, "google": 38}
LAST_ROW = {"meta": 33, "google": 68}

# "Day" (dia-do-mês) — uma coluna por sub-seção do bloco. Escritas junto com
# as métricas em toda gravação: são idempotentes (dia N é sempre dia N), não
# precisam de um caminho especial de "linha nova" como em scripts/dados_lp.
DAY_COLS = {"meta": ("A", "G", "Q"), "google": ("A", "I", "Q")}

# Métrica -> (bloco, coluna). NÃO inclui as colunas de "Day" (DAY_COLS) nem os
# espaçadores em branco (F/P no bloco meta, H/P no bloco google) — de
# propósito, pra cell_updates nunca poder acertá-los.
COLS = {
    "meta_aw_invest": ("meta", "B"),
    "meta_aw_alcance": ("meta", "C"),
    "meta_aw_impressoes": ("meta", "D"),
    "meta_aw_seguidores": ("meta", "E"),
    "meta_invest": ("meta", "H"),
    "meta_alcance": ("meta", "I"),
    "meta_impressoes": ("meta", "J"),
    "meta_cliques": ("meta", "K"),
    "meta_lpv": ("meta", "L"),
    "meta_leads": ("meta", "M"),
    "meta_mql": ("meta", "N"),
    "meta_sql": ("meta", "O"),
    "ga4_sessoes": ("meta", "R"),
    "google_search_invest": ("google", "B"),
    "google_search_impressoes": ("google", "C"),
    "google_search_cliques": ("google", "D"),
    "google_search_conv": ("google", "E"),
    "google_search_mql": ("google", "F"),
    "google_search_sql": ("google", "G"),
    "google_pmax_invest": ("google", "J"),
    "google_pmax_impressoes": ("google", "K"),
    "google_pmax_cliques": ("google", "L"),
    "google_pmax_conv": ("google", "M"),
    "google_pmax_mql": ("google", "N"),
    "google_pmax_sql": ("google", "O"),
    "google_dgen_invest": ("google", "R"),
    "google_dgen_impressoes": ("google", "S"),
    "google_dgen_cliques": ("google", "T"),
    "google_dgen_conv": ("google", "U"),
    "google_dgen_mql": ("google", "V"),
    "google_dgen_sql": ("google", "W"),
}


def row_for_day(block, day):
    """Dia-do-mês (1-31) -> nº da linha, dentro do bloco ("meta" ou "google")."""
    if block not in FIRST_ROW:
        raise ValueError(f"bloco inválido: {block!r} (use 'meta' ou 'google')")
    if not 1 <= day <= 31:
        raise ValueError(f"dia inválido: {day!r} (use 1-31)")
    return FIRST_ROW[block] + day - 1


def cell_updates(day, metrics):
    """{chave de COLS: valor} -> [(A1, valor)], só as chaves presentes e
    não-None, na ordem de COLS.

    Chave fora de COLS é erro, não silêncio — é a barreira contra alguém
    tentar gravar numa coluna de "Day" ou de espaçador."""
    unknown = set(metrics) - set(COLS)
    if unknown:
        raise ValueError(f"métricas desconhecidas: {sorted(unknown)}")
    out = []
    for key, (block, col) in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row_for_day(block, day)}", value))
    return out


def day_label_updates(day):
    """Dia -> [(A1, dia)] pras três colunas "Day" de cada bloco.

    Idempotente: dia N é sempre dia N, então é seguro gravar junto com as
    métricas em toda execução, não só na primeira vez que a linha recebe dado."""
    out = []
    for block, cols in DAY_COLS.items():
        row = row_for_day(block, day)
        for col in cols:
            out.append((f"{col}{row}", day))
    return out


def write_updates(worksheet, updates, value_input_option="RAW"):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body, value_input_option=value_input_option)
    return len(body)
