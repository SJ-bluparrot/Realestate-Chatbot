import json
import threading
from datetime import datetime
from pathlib import Path
from models.session import UserState
from core.sheets import upsert_lead as _sheets_upsert

LEADS_FILE = Path(__file__).parent.parent / "leads" / "leads.json"
CONTACTS_FILE = Path(__file__).parent.parent / "leads" / "contacts.json"
_lock = threading.Lock()


def save_lead(session_id: str, state: UserState) -> None:
    """Upsert session data into leads/leads.json after every message. Thread-safe.
    Stores all available info — partial sessions (no phone/name) are kept too."""
    now = datetime.utcnow().isoformat() + "Z"
    lead = {
        "session_id": session_id,
        "last_updated": now,
        "name": state.name,
        "phone": state.phone,
        "intent": state.intent,
        "bhk_preference": state.bhk_preference,
        "budget_cr": state.budget_cr,
        "project_interest": state.project_bias,
        "lead_stage": state.lead_stage,
        "language": state.language,
        "messages_count": state.messages_count,
    }

    LEADS_FILE.parent.mkdir(parents=True, exist_ok=True)

    with _lock:
        try:
            with open(LEADS_FILE, "r", encoding="utf-8") as f:
                leads = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            leads = []

        for existing in leads:
            if existing.get("session_id") == session_id:
                # Preserve original first_seen timestamp
                lead["first_seen"] = existing.get("first_seen", existing.get("last_updated", now))
                existing.clear()
                existing.update(lead)
                with open(LEADS_FILE, "w", encoding="utf-8") as f:
                    json.dump(leads, f, indent=2, ensure_ascii=False)
                _sheets_upsert(lead)
                return

        # New session — set first_seen
        lead["first_seen"] = now
        leads.append(lead)
        with open(LEADS_FILE, "w", encoding="utf-8") as f:
            json.dump(leads, f, indent=2, ensure_ascii=False)

    print(f"[leads] New session tracked — {session_id} / stage: {state.lead_stage}")

    # Mirror to Google Sheets (background thread, non-blocking)
    _sheets_upsert(lead)


def save_contact(name: str, phone: str, source: str = "widget") -> None:
    """Save a widget/popup contact capture to leads/contacts.json. Thread-safe."""
    contact = {
        "captured_at": datetime.utcnow().isoformat() + "Z",
        "name": name,
        "phone": phone,
        "source": source,
    }

    CONTACTS_FILE.parent.mkdir(parents=True, exist_ok=True)

    with _lock:
        try:
            with open(CONTACTS_FILE, "r", encoding="utf-8") as f:
                contacts = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            contacts = []

        # Avoid duplicate phone entries
        for existing in contacts:
            if existing.get("phone") == phone:
                existing.update(contact)
                with open(CONTACTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(contacts, f, indent=2, ensure_ascii=False)
                print(f"[contacts] Updated contact — {name} / {phone}")
                return

        contacts.append(contact)
        with open(CONTACTS_FILE, "w", encoding="utf-8") as f:
            json.dump(contacts, f, indent=2, ensure_ascii=False)

    print(f"[contacts] Saved new contact — {name} / {phone} / source: {source}")
