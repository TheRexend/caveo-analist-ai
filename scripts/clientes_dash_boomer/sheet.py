"""Helper da skill `fechamentos-midia-paga-boomer` — casca fina de I/O sobre
gspread, no padrão de scripts/dados_lp/ e scripts/acompanhamento_diario/.

Ao contrário dessas duas, esta aba não é um bloco fixo de células: é uma
lista, uma linha por Oportunidade Ganho de mídia paga. Por isso o
upsert é por `Id Oportunidade` na coluna A, não por data na coluna A.
"""

from datetime import datetime, timedelta, timezone
from calendar import monthrange

BRT = timezone(timedelta(hours=-3))

HEADER = [
    "Id Oportunidade", "Nome", "Canal", "Estagio", "IsWon",
    "Fechamento (Data)", "Criado em",
    "UtmSou__c", "UtmMed__c", "UtmCam__c", "UtmCon__c", "UtmTer__c",
    "gclid__c", "gbraid__c", "wbraid__c", "fbclid__c", "fbc__c",
    "Descrição",
]

# Fragmento SOQL Ganho, docs/fundacao-dados.md § "Fragmentos SOQL prontos":
# (IsWon = true OR StageName = 'Ganho não Identificado')
# Fragmento de atribuição mídia paga (cpc direto OU cruzamento por click ID),
# docs/fundacao-dados.md § "Fragmentos SOQL prontos", coluna "all":
PAID_MEDIA_CLAUSE = (
    "((UtmMed__c LIKE '%cpc%') OR "
    "((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) "
    "AND (fbc__c != null OR fbclid__c != null "
    "OR gclid__c != null OR gbraid__c != null)))"
)

# Canal — UTM source -> plataforma, docs/fundacao-dados.md § "1. Canal".
META_PREFIXES = ("facebook", "instagram", "messenger", "audience_network", "{{placement}}")
GOOGLE_PREFIXES = ("google", "youtube")

DESC_CRUZAMENTO = (
    "Fechamento com último clique orgânico/direto (UtmMed__c != cpc), mas com "
    "interação prévia identificada com anúncio pago via click ID ({sinal}) — "
    "atribuído por cruzamento, não por UTM direto."
)


def to_brt(iso):
    """'2026-08-18T00:02:43.000+0000' -> datetime em -03:00, ou None."""
    if not iso:
        return None
    return datetime.strptime(iso, "%Y-%m-%dT%H:%M:%S.%f%z").astimezone(BRT)


def to_brt_date_str(iso):
    dt = to_brt(iso)
    return dt.strftime("%d/%m/%Y") if dt else ""


def canal_e_cruzamento(record):
    """(Canal, é_cruzamento) a partir dos campos UTM/click ID da Oportunidade.

    cpc direto (UtmSou__c bate no prefixo E UtmMed__c tem cpc) não é
    cruzamento. Click ID presente com medium != cpc é cruzamento — Meta tem
    prioridade sobre Google em caso de conflito (docs/fundacao-dados.md § 2).
    """
    sou = (record.get("UtmSou__c") or "").lower()
    med = (record.get("UtmMed__c") or "").lower()
    is_cpc = "cpc" in med

    if sou.startswith(META_PREFIXES) and is_cpc:
        return "Meta Ads", False
    if sou.startswith(GOOGLE_PREFIXES) and is_cpc:
        return "Google/YouTube", False
    if record.get("fbc__c") or record.get("fbclid__c"):
        return "Meta Ads", True
    if record.get("gclid__c") or record.get("gbraid__c"):
        return "Google/YouTube", True
    # Fallback defensivo: a query já filtra por PAID_MEDIA_CLAUSE, então só
    # cai aqui um registro com UtmSou__c preenchido mas cpc por outra via.
    if sou.startswith(META_PREFIXES):
        return "Meta Ads", False
    if sou.startswith(GOOGLE_PREFIXES):
        return "Google/YouTube", False
    return "Não Digital", False


def build_row(record):
    """Registro da query SOQL (dict com os campos do SELECT) -> linha da aba."""
    canal, is_cruzamento = canal_e_cruzamento(record)

    descricao = ""
    if is_cruzamento:
        if canal == "Meta Ads":
            sinal = "fbc__c" if record.get("fbc__c") else "fbclid__c"
        else:
            sinal = "gclid__c" if record.get("gclid__c") else "gbraid__c"
        descricao = DESC_CRUZAMENTO.format(sinal=sinal)

    return [
        record.get("Id") or "",
        record.get("Name") or "",
        canal,
        record.get("StageName") or "",
        "TRUE" if record.get("IsWon") else "FALSE",
        to_brt_date_str(record.get("LastStageChangeDate")),
        to_brt_date_str(record.get("CreatedDate")),
        record.get("UtmSou__c") or "",
        record.get("UtmMed__c") or "",
        record.get("UtmCam__c") or "",
        record.get("UtmCon__c") or "",
        record.get("UtmTer__c") or "",
        record.get("gclid__c") or "",
        record.get("gbraid__c") or "",
        record.get("wbraid__c") or "",
        record.get("fbclid__c") or "",
        record.get("fbc__c") or "",
        descricao,
    ]


def id_row_map(col_a):
    """Coluna A já lida (`ws.col_values(1)`) -> {Id Oportunidade: nº da linha}.

    Linha 1 é cabeçalho. Ignora células vazias (linhas mescladas/em branco
    não devem existir nesta aba, mas não travar se aparecerem).
    """
    return {value: i + 1 for i, value in enumerate(col_a) if i > 0 and value}


def diff_rows(records, existing_ids):
    """records (da query) + {Id: nº linha já na aba} -> (updates, novas).

    updates: [(nº linha, linha completa)] — upsert incondicional: uma
    oportunidade Ganho já escrita pode ter LastStageChangeDate/UTM
    atualizado depois (ex.: reprocessamento), então sempre regravar em vez
    de tentar diff campo a campo.
    novas: [linha completa] — na ordem de `records`, para `append_rows`.
    """
    updates, novas = [], []
    for record in records:
        row = build_row(record)
        row_num = existing_ids.get(row[0])
        if row_num:
            updates.append((row_num, row))
        else:
            novas.append(row)
    return updates, novas


def write_diff(ws, updates, novas):
    """Grava updates (batch) e novas (append). Retorna (nº atualizadas, nº criadas)."""
    if updates:
        body = [
            {"range": f"A{row_num}:R{row_num}", "values": [row]}
            for row_num, row in updates
        ]
        ws.batch_update(body, value_input_option="USER_ENTERED")
    if novas:
        ws.append_rows(novas, value_input_option="USER_ENTERED")
    return len(updates), len(novas)


def month_bounds_default(today):
    """Mês corrente, do dia 1 até D-1. `today` é um `date`.

    Se hoje é dia 1, D-1 cai no mês anterior: não há nenhum dia-alvo ainda
    neste mês — retorna None para o caller decidir parar e avisar.
    """
    end = today - timedelta(days=1)
    start = today.replace(day=1)
    if end < start:
        return None
    return start, end


def parse_period_arg(arg, today):
    """`$ARGUMENTS` -> (start, end), ambos `date`.

    Aceita:
    - "" / None -> `month_bounds_default(today)`.
    - "YYYY-MM" -> mês inteiro; se for o mês corrente, capado em D-1 (mesma
      regra do padrão); mês futuro é erro.
    - "YYYY-MM-DD a YYYY-MM-DD" -> intervalo explícito, sem cap de D-1 (uso
      explícito do usuário, ele decide se quer incluir hoje).
    """
    if not arg or not arg.strip():
        bounds = month_bounds_default(today)
        if bounds is None:
            raise ValueError(
                "Hoje é dia 1 do mês — ainda não há nenhum D-1 dentro do mês "
                "corrente para coletar."
            )
        return bounds

    arg = arg.strip()
    if " a " in arg:
        start_s, end_s = arg.split(" a ", 1)
        start = datetime.strptime(start_s.strip(), "%Y-%m-%d").date()
        end = datetime.strptime(end_s.strip(), "%Y-%m-%d").date()
        if end < start:
            raise ValueError(f"Intervalo invertido: {arg}")
        return start, end

    ano, mes = (int(p) for p in arg.split("-"))
    start = datetime(ano, mes, 1).date()
    last_day = monthrange(ano, mes)[1]
    end = datetime(ano, mes, last_day).date()

    is_current_month = (ano, mes) == (today.year, today.month)
    if is_current_month:
        capped = today - timedelta(days=1)
        if capped < start:
            raise ValueError(
                f"{arg} é o mês corrente e hoje é dia 1 — ainda não há D-1 "
                "dentro dele."
            )
        end = min(end, capped)
    elif (ano, mes) > (today.year, today.month):
        raise ValueError(f"{arg} é um mês futuro.")

    return start, end
