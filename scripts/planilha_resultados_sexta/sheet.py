"""Layout da aba "Banco de dados - Inside Sales" (skill planilha-resultados-sexta).

Diferente de scripts/dados_lp/sheet.py: aqui a linha é o DIA-DO-MÊS (1-31),
fixo por bloco — não uma data absoluta que cresce sem fim. O bloco "meta"
(Meta Ads Awareness + Demais Campanhas + GA4) ocupa as linhas 3-33; o bloco
"google" (Search + PMax + DGen) ocupa as linhas 38-68; o bloco "historico"
(comparativo A-1/M-1) ocupa as MESMAS linhas 3-33 do bloco "meta", só que
nas colunas T:V. As mesmas 31 linhas são recicladas todo mês — não há
lógica de "criar linha nova" aqui.
"""

FIRST_ROW = {"meta": 3, "google": 38, "historico": 3}
LAST_ROW = {"meta": 33, "google": 68, "historico": 33}

# "Day" (dia-do-mês) — uma coluna por sub-seção do bloco. Escritas junto com
# as métricas em toda gravação: são idempotentes (dia N é sempre dia N), não
# precisam de um caminho especial de "linha nova" como em scripts/dados_lp.
DAY_COLS = {"meta": ("A", "G", "Q"), "google": ("A", "I", "Q"), "historico": ("T",)}

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
    "leads_a1": ("historico", "U"),
    "leads_m1": ("historico", "V"),
}

# Colunas de métrica por bloco, derivadas de COLS — usadas pra saber quais
# células checar ao decidir se uma linha está vazia/parcial/cheia.
BLOCK_METRIC_COLS = {}
for _key, (_block, _col) in COLS.items():
    BLOCK_METRIC_COLS.setdefault(_block, set()).add(_col)
del _key, _block, _col


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


def _filled_count(block, grid_row):
    """Quantas das colunas de métrica do bloco estão preenchidas nessa linha
    (fatia A.., índice 0 = A). Ignora "Day" e espaçadores de propósito —
    essas colunas vêm sempre preenchidas (ou vazias) independente de haver
    dado real na linha."""
    count = 0
    for col in BLOCK_METRIC_COLS[block]:
        index = ord(col) - ord("A")
        value = grid_row[index] if index < len(grid_row) else ""
        if str(value).strip() != "":
            count += 1
    return count


def row_is_empty(block, grid_row):
    """True se nenhuma das colunas de métrica do bloco estiver preenchida."""
    return _filled_count(block, grid_row) == 0


def pending_days(block, grid, until_day):
    """Dias 1..until_day cuja linha está totalmente vazia (ou nem existe
    ainda no `grid` lido — mesma coisa, célula em branco é célula em branco).

    Linha parcialmente preenchida fica de fora: sobrescrever dado que já está
    lá é decisão do usuário, via override de $ARGUMENTS na skill."""
    return [day for day in range(1, until_day + 1)
            if row_is_empty(block, grid.get(row_for_day(block, day), []))]


def partial_days(block, grid, until_day):
    """Dias 1..until_day com a linha pela metade. Não são gravados, mas o
    preview precisa avisar que existem."""
    total = len(BLOCK_METRIC_COLS[block])
    out = []
    for day in range(1, until_day + 1):
        count = _filled_count(block, grid.get(row_for_day(block, day), []))
        if 0 < count < total:
            out.append(day)
    return out


MESES_PT = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
            "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]


def month_name(month_number):
    """1-12 -> nome do mês em maiúsculo, pt-BR — bate com o rótulo manual da
    aba "Inside Sales"!B1 (ex. "AGOSTO")."""
    if not 1 <= month_number <= 12:
        raise ValueError(f"mês inválido: {month_number!r} (use 1-12)")
    return MESES_PT[month_number - 1]


def month_changed(active_label, month_number):
    """True se o rótulo de mês ativo na planilha for diferente do mês
    corrente — sinal para limpar o "Banco de dados" antes de gravar."""
    return active_label.strip().upper() != month_name(month_number)


# Ranges a limpar na virada de mês — as colunas graváveis + "Day" dos dois
# blocos, incluindo o bloco "historico" (T:V, dentro das mesmas linhas do
# bloco "meta") — A-1/M-1 do mês que saiu não fazem sentido pro mês novo.
# Nunca cobre TikTok/Pinterest (fora do escopo desta skill).
CLEAR_RANGES = {"meta": "A3:V33", "google": "A38:W68"}


# Mapa Opportunity.UtmCam__c (slug interno do Salesforce) -> tipo de
# campanha Google, só pras 5 campanhas ATIVAS hoje (2026-08-21):
#   institucional              -> BOO - Search - Institucional
#   search_aberturaPJ          -> BOO - Search - Abertura PJ
#   search_contabilidade       -> BOO - Search - Contabilidade Médica
#   pmax_funcionalidade        -> BOO - Pmax - Funcionalidades
#   pmax_oferta                -> BOO - Pmax - Oferta
# Revisar sempre que a conta Google Ads for reestruturada — mesmo problema
# que já quebrou o GOOGLE_UTMCAM_ALIAS da antiga skill planilha-resultados.
UTMCAM_TO_GOOGLE_TYPE = {
    "institucional": "search",
    "search_aberturapj": "search",
    "search_contabilidade": "search",
    "pmax_funcionalidade": "pmax",
    "pmax_oferta": "pmax",
}

# Decisão do cliente (2026-08-21): UtmCam__c de campanha antiga/reestruturada
# sem mapeamento conhecido cai em "search" — não descartar o número do
# dashboard, e não inferir por prefixo do slug (ver teste de regressão).
DEFAULT_GOOGLE_TYPE = "search"


def google_channel_bucket(utmcam):
    """Slug de Opportunity.UtmCam__c -> "search"/"pmax"/"dgen".

    None ou slug sem mapeamento conhecido -> DEFAULT_GOOGLE_TYPE."""
    if utmcam is None:
        return DEFAULT_GOOGLE_TYPE
    return UTMCAM_TO_GOOGLE_TYPE.get(utmcam.strip().lower(), DEFAULT_GOOGLE_TYPE)
