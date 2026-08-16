"""Layout da aba 'Dados Landingpage' + leitura/escrita no Google Sheets.

Lógica pura (mapa de datas, escolha de linhas, montagem de células) separada de
uma casca fina de I/O sobre gspread, no padrão de scripts/acompanhamento_diario/.

O contrato central é COLS: ele não contém as colunas de rótulo (B, G, L, O) nem
as de fórmula (P..W), então é estruturalmente impossível esta skill sobrescrever
o bloco Total Geral de uma linha existente.
"""
from datetime import date, timedelta

FIRST_DATA_ROW = 2

# Métrica -> coluna. A ordem define a ordem dos updates.
# NÃO inclui B, G, L, O (rótulos) nem P..W (fórmulas) — de propósito.
COLS = {
    "meta_impressoes": "C",
    "meta_cliques": "D",
    "meta_leads": "E",
    "meta_invest": "F",
    "google_impressoes": "H",
    "google_cliques": "I",
    "google_leads": "J",
    "google_invest": "K",
    "ga4_sessoes": "M",
    "ga4_bounce": "N",
}

# Rótulos fixos que toda linha carrega. Só são escritos ao CRIAR uma linha nova.
ROW_LABELS = {"B": "Meta Ads", "G": "Google Ads", "L": "GA4", "O": "Total Geral"}

# Bloco Total Geral. Só é escrito ao CRIAR uma linha nova, com {r} reancorado.
ROW_FORMULAS = {
    "P": "=H{r}+C{r}",
    "Q": "=I{r}+D{r}",
    "R": "=Q{r}/P{r}",
    "S": "=M{r}",
    "T": "=(K{r}+F{r})/S{r}",
    "U": "=S{r}/Q{r}",
    "V": "=J{r}+E{r}",
    "W": "=V{r}/S{r}",
}

# Guarda contra um `until` errado gerar centenas de linhas.
MAX_NEW_ROWS = 31

# Formato da coluna N (bounce). Copiado da linha 2, a única que já vinha
# formatada à mão. Ver ensure_bounce_format().
BOUNCE_FORMAT = {"numberFormat": {"type": "PERCENT", "pattern": "0.00%"}}

# grid_row é a fatia C..N devolvida pelo gspread: índice 0 = C.
_GRID_FIRST_COL = "C"


def _parse_br_date(text):
    """'13/08/2026' -> '2026-08-13'. Devolve None se não for uma data válida."""
    parts = str(text).strip().split("/")
    if len(parts) != 3:
        return None
    day, month, year = parts
    if not (day.isdigit() and month.isdigit() and year.isdigit()):
        return None
    try:
        return date(int(year), int(month), int(day)).isoformat()
    except ValueError:
        return None


def build_date_row_map(col_a):
    """Coluna A inteira (com cabeçalho) -> {'2026-08-13': 2, ...}.

    Lê a coluna de verdade em vez de assumir um offset fixo: a aba pode ser
    estendida por fora da skill. Células que não são data (cabeçalho, branco,
    rodapé) são ignoradas."""
    out = {}
    for index, raw in enumerate(col_a):
        row = index + 1
        if row < FIRST_DATA_ROW:
            continue
        iso = _parse_br_date(raw)
        if iso is not None:
            out[iso] = row
    return out


def check_consecutive(date_row_map):
    """Datas ISO que faltam para a coluna A ser uma sequência diária íntegra.

    Lista vazia = tabela íntegra. NÃO conserta nada: buraco no meio da tabela é
    anomalia que interrompe a execução, porque inserir linha no meio deslocaria
    as linhas seguintes e quebraria as âncoras das fórmulas P..W."""
    if not date_row_map:
        return []
    present = set(date_row_map)
    cursor = date.fromisoformat(min(present))
    last = date.fromisoformat(max(present))
    expected = set()
    while cursor <= last:
        expected.add(cursor.isoformat())
        cursor += timedelta(days=1)
    return sorted(expected - present)


def _filled_count(grid_row):
    """Quantas das dez células graváveis estão preenchidas nessa fatia C..N.

    Olha só as colunas de COLS: G e L carregam rótulo fixo em toda linha e não
    podem contar como 'dado'. O gspread também corta os vazios do fim, então a
    fatia pode vir mais curta que 12 — daí o teste de comprimento."""
    count = 0
    for col in COLS.values():
        index = ord(col) - ord(_GRID_FIRST_COL)
        value = grid_row[index] if index < len(grid_row) else ""
        if str(value).strip() != "":
            count += 1
    return count


def row_is_empty(grid_row):
    """True se nenhuma das dez células graváveis estiver preenchida."""
    return _filled_count(grid_row) == 0


def pending_dates(date_row_map, grid, until):
    """Datas <= until cuja linha existe e está totalmente vazia.

    Linha parcialmente preenchida fica de fora: sobrescrever dado que já está lá
    é decisão do usuário, via o override de $ARGUMENTS."""
    out = []
    for iso in sorted(date_row_map):
        if iso <= until and row_is_empty(grid.get(date_row_map[iso], [])):
            out.append(iso)
    return out


def partial_dates(date_row_map, grid, until):
    """Datas <= until com a linha pela metade. Não são gravadas, mas o preview
    precisa avisar que elas existem."""
    out = []
    for iso in sorted(date_row_map):
        if iso > until:
            continue
        count = _filled_count(grid.get(date_row_map[iso], []))
        if 0 < count < len(COLS):
            out.append(iso)
    return out


def missing_dates(date_row_map, until):
    """Datas <= until posteriores à última data da coluna A, em sequência diária.

    São as linhas que ainda não existem e precisam ser criadas."""
    if not date_row_map:
        raise ValueError("coluna A sem nenhuma data: não há sequência para continuar")
    cursor = date.fromisoformat(max(date_row_map)) + timedelta(days=1)
    end = date.fromisoformat(until)
    out = []
    while cursor <= end:
        out.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return out


def append_rows_payload(first_new_row, dates):
    """Clone completo de linha para cada data nova, em sequência a partir de
    first_new_row: data na coluna A, rótulos em B/G/L/O e as oito fórmulas do
    bloco Total Geral reancoradas na linha.

    A linha tem que nascer inteira. Uma linha só com a data deixaria CTR, CPS,
    Connect Rate e Tx de conversão em branco para sempre naquele dia.

    Devolve [(A1, valor)] para gravar com USER_ENTERED."""
    if len(dates) > MAX_NEW_ROWS:
        raise ValueError(
            f"{len(dates)} linhas novas excede o limite de {MAX_NEW_ROWS}; "
            "confira o período antes de continuar")
    out = []
    for offset, iso in enumerate(dates):
        row = first_new_row + offset
        year, month, day = iso.split("-")
        out.append((f"A{row}", f"{day}/{month}/{year}"))
        for col, label in ROW_LABELS.items():
            out.append((f"{col}{row}", label))
        for col, template in ROW_FORMULAS.items():
            out.append((f"{col}{row}", template.format(r=row)))
    return out


def cell_updates(row, metrics):
    """{chave de COLS: valor} -> [(A1, valor)], só as chaves presentes e
    não-None, na ordem de COLS.

    Chave fora de COLS é erro, não silêncio: é a última barreira contra alguém
    tentar gravar 'total_geral' e acertar uma coluna de fórmula."""
    unknown = set(metrics) - set(COLS)
    if unknown:
        raise ValueError(f"métricas desconhecidas: {sorted(unknown)}")
    out = []
    for key, col in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row}", value))
    return out


def ensure_bounce_format(worksheet, first_row, last_row):
    """Garante que a coluna N esteja formatada como porcentagem no intervalo.

    O bounce é gravado em fração (0,0263). Sem esse formato a célula exibe
    '0,0263' em vez de '2,63%'. Só a linha 2 da planilha, preenchida à mão,
    já vinha formatada — as demais nasceram sem formato nenhum, e a primeira
    execução real caiu exatamente nisso.

    Devolve o intervalo formatado, ou None se não havia o que formatar."""
    if last_row < first_row:
        return None
    cell_range = f"N{first_row}:N{last_row}"
    worksheet.format(cell_range, BOUNCE_FORMAT)
    return cell_range


def write_updates(worksheet, updates, value_input_option="RAW"):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas.

    RAW para métricas (número é número). USER_ENTERED para o payload de linha
    nova, onde a data precisa virar serial e a fórmula precisa ser interpretada."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body, value_input_option=value_input_option)
    return len(body)
