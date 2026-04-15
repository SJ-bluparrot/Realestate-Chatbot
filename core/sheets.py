"""
Google Sheets sync for Inframantra Leads.

Writes every lead upsert to the "Inframantra Leads" spreadsheet in a
background thread so it never blocks the API response.

Sheet columns (must match row 1 headers exactly):
  A: session_id  B: name  C: phone  D: intent  E: bhk_preference
  F: project_interest  G: lead_stage  H: messages_count
  I: first_seen  J: last_updated
"""

import os
import threading
from pathlib import Path

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

load_dotenv()

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_COLUMNS = [
    "session_id", "name", "phone", "intent", "bhk_preference",
    "project_interest", "lead_stage", "messages_count",
    "first_seen", "last_updated",
]

_worksheet: gspread.Worksheet | None = None
_write_lock = threading.Lock()


def _init() -> gspread.Worksheet | None:
    """Connect to the sheet at import time so errors surface immediately."""
    global _worksheet

    sheet_url = os.getenv("GOOGLE_SHEET_URL", "").strip()
    creds_file = os.getenv("GOOGLE_CREDENTIALS_FILE", "credentials.json").strip()

    if not sheet_url or sheet_url == "PASTE_YOUR_SHEET_URL_HERE":
        print("[sheets] GOOGLE_SHEET_URL not set — Google Sheets sync disabled", flush=True)
        return None
    if not Path(creds_file).exists():
        print(f"[sheets] {creds_file} not found — Google Sheets sync disabled", flush=True)
        return None

    try:
        creds = Credentials.from_service_account_file(creds_file, scopes=_SCOPES)
        gc = gspread.authorize(creds)
        sh = gc.open_by_url(sheet_url)
        ws = sh.sheet1
        print(f"[sheets] Connected to Google Sheet: '{sh.title}' — live sync active", flush=True)
        return ws
    except Exception as e:
        print(f"[sheets] Connection failed: {e}", flush=True)
        return None


# Connect immediately when module is imported
_worksheet = _init()


def _row_for(lead: dict) -> list:
    return [str(lead.get(col) or "") for col in _COLUMNS]


def upsert_lead(lead: dict) -> None:
    """
    Upsert a lead row in the Google Sheet.
    Finds the row by session_id (col A) and updates it; appends if not found.
    Runs in a background thread — never blocks the caller.
    """
    if _worksheet is None:
        return

    def _sync():
        with _write_lock:
            try:
                session_id = lead.get("session_id", "")
                new_row = _row_for(lead)
                cell = _worksheet.find(session_id, in_column=1)
                if cell:
                    _worksheet.update(f"A{cell.row}:J{cell.row}", [new_row])
                else:
                    _worksheet.append_row(new_row, value_input_option="USER_ENTERED")
                print(f"[sheets] Synced: {session_id} | {lead.get('name')} | {lead.get('lead_stage')}", flush=True)
            except Exception as e:
                print(f"[sheets] Sync error: {e}", flush=True)

    threading.Thread(target=_sync, daemon=True).start()
