#!/usr/bin/env python3
"""CLI: lê seeds (tema,balde,keyword), consulta volume de busca no Google Ads
Keyword Planner e grava numa planilha Google Sheets dedicada.

Uso: python3 scripts/keyword_volume/run.py --seeds scripts/keyword_volume/seeds_2026-08-04.csv
"""
import argparse
import csv
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from client import fetch_historical_metrics
from config import load_google_ads_config
from parser import sorted_rows
from sheet import (
    authorize,
    build_sheet_rows,
    get_or_create_spreadsheet,
    get_or_create_worksheet,
    write_rows,
)

SHEET_ID_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".sheet_id")
SPREADSHEET_TITLE = "Caveo — Volume de Busca (Keywords)"
SHARE_EMAIL = "matheus.moreira@boomer.com.br"


def read_seeds(path):
    theme_lookup = {}
    keywords = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            keyword = row["keyword"].strip()
            keywords.append(keyword)
            theme_lookup[keyword] = (row["tema"].strip(), row["balde"].strip())
    return keywords, theme_lookup


def main():
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("--seeds", required=True, help="Caminho do CSV tema,balde,keyword")
    arg_parser.add_argument("--tab-name", default=date.today().isoformat())
    args = arg_parser.parse_args()

    keywords, theme_lookup = read_seeds(args.seeds)
    print(f"Consultando volume de busca para {len(keywords)} keywords...")

    config = load_google_ads_config()
    raw_metrics = fetch_historical_metrics(config, keywords)
    rows = sorted_rows(raw_metrics)
    sheet_rows = build_sheet_rows(rows, theme_lookup)

    gc = authorize()
    spreadsheet = get_or_create_spreadsheet(gc, SHEET_ID_FILE, SPREADSHEET_TITLE, SHARE_EMAIL)
    worksheet = get_or_create_worksheet(spreadsheet, args.tab_name)
    written = write_rows(worksheet, sheet_rows)

    print("\nTop 10 por volume médio mensal:")
    for row in rows[:10]:
        print(f"  {row['keyword']:<50} vol={row['avg_monthly_searches']!s:<8} "
              f"conc={row['competition']}")

    print(f"\n{written} linhas gravadas na aba '{args.tab_name}'.")
    print(f"Planilha: https://docs.google.com/spreadsheets/d/{spreadsheet.id}")


if __name__ == "__main__":
    main()
