"""Mapeamento de células — planilha "Relação de Leads" (skill planilha-resultados).

Blocos mensais (não diário, ao contrário de acompanhamento_diario/sheet.py):
MÉDICO nas linhas 30-53, FORMANDO nas linhas 58-81 (offset fixo
de +28 sobre as linhas do bloco Médico). O bloco "Geral" (linhas 1-26, colunas
I/J) é 100% fórmula (=Médico+Formando) e nunca é tocado — mesma regra do TOTAL em
acompanhamento_diario/sheet.py. CPL, T Conv/T Oport./T SQL/T Fechamento., a
coluna "%" da tabela de estágio e a linha TOTAL também são fórmulas da
própria planilha. CPM e CTR são valores estáticos (sem fórmula) e por isso
precisam ser calculados e gravados por esta skill.
"""

BLOCK_BASE = {"medico": 0, "formando": 28}

# Métrica -> (coluna, linha-base no bloco Médico). Formando soma BLOCK_BASE["formando"].
COLS = {
    "invest_meta": ("B", 30),
    "impressoes_meta": ("B", 32),
    "cpm_meta": ("B", 33),
    "clicks_meta": ("B", 34),
    "ctr_meta": ("B", 35),
    "leads_meta": ("B", 36),
    "mql_meta": ("B", 38),
    "sql_meta": ("B", 40),
    "fechamento_meta": ("B", 42),
    "invest_google": ("F", 30),
    "impressoes_google": ("F", 32),
    "cpm_google": ("F", 33),
    "clicks_google": ("F", 34),
    "ctr_google": ("F", 35),
    "leads_google": ("F", 36),
    "mql_google": ("F", 38),
    "sql_google": ("F", 40),
    "fechamento_google": ("F", 42),
}

# Estágio -> linha-base no bloco Médico (tabela "Estágio | Oportunidades | %").
STAGE_ROWS = {
    "Aguardando Resposta": 46,
    "Contato Realizado": 47,
    "Perdido": 48,
    "Fechado Ganho": 49,
    "Proposta Enviada": 50,
    "Nova": 51,
    "Standy-By": 52,
    "Ganho não Identificado": 53,
}
STAGE_COL = {"meta": "B", "google": "F"}


def cell_updates(segment, metrics, stages):
    """[(A1, valor)] para um bloco (medico/formando).

    metrics: dict com um subconjunto das chaves de COLS (None/ausente é
    ignorado — mas 0 é gravado, é um valor real).
    stages: {"meta": {StageName: qtd}, "google": {StageName: qtd}} —
    estágio ausente grava 0 explícito (mesma regra de zero explícito do
    acompanhamento-diario-caveo: célula vazia só deve significar "não
    processado", nunca "processado e é zero").
    """
    if segment not in BLOCK_BASE:
        raise ValueError(f"segmento inválido: {segment!r} (use 'medico' ou 'formando')")
    base = BLOCK_BASE[segment]
    out = []
    for key, (col, row) in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row + base}", value))
    for platform, col in STAGE_COL.items():
        by_stage = stages.get(platform, {})
        for stage, row in STAGE_ROWS.items():
            out.append((f"{col}{row + base}", by_stage.get(stage, 0)))
    return out


def write_updates(worksheet, updates):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body)
    return len(body)
