import json
import re
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from core.redis_client import load_session, save_session, clear_session, get_redis
from core.decision_engine import classify, should_trigger_urgency
from core.leads import save_lead, save_contact
from core.gemini import chat
from knowledge.ingest import build_knowledge_base
from knowledge.retriever import load as load_kb, retrieve, chunk_count
from models.session import ChatMessage
from models.response import ChatResponse
from prompts.system_prompt import build as build_prompt, is_off_topic

load_dotenv()

BASE_DIR = Path(__file__).parent
BROCHURES = {
    "westin-main": BASE_DIR / "Westin-Residences-Brochure" / "The Westin Residences, Gurugram.pdf",
    "tulip": BASE_DIR / "Tupil-Monsella-PDF's" / "brochure small.pdf",
}

RESET_PHRASES = {"reset", "start over", "clear chat", "shuru karo", "restart"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Building knowledge base...")
    chunks = build_knowledge_base()
    load_kb(chunks)
    print(f"[startup] Ready. {chunk_count()} chunks loaded.")
    yield


app = FastAPI(title="Inframantra Chatbot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ContactRequest(BaseModel):
    name: str
    phone: str
    source: str = "widget"
    session_id: str = ""


class BookingRequest(BaseModel):
    session_id: str
    visit_date: str   # e.g. "2026-04-20"
    visit_time: str   # e.g. "11:00 AM"


@app.get("/health")
def health():
    try:
        get_redis().ping()
        redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    return {
        "status": "ok",
        "redis": redis_status,
        "knowledge_chunks": chunk_count(),
    }


@app.get("/brochures/{slug}")
def download_brochure(slug: str):
    path = BROCHURES.get(slug)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="Brochure not found")
    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=path.name,
    )


@app.post("/capture-contact", status_code=201)
def capture_contact(request: ContactRequest):
    name = request.name.strip()
    phone = request.phone.strip()
    source = request.source

    # Save to contacts.json (widget-specific log)
    save_contact(name=name, phone=phone, source=source)

    # Merge into the existing chat session if session_id was provided,
    # otherwise fall back to a widget-keyed entry
    session_key = request.session_id.strip() if request.session_id.strip() else f"widget-{phone}"
    session = load_session(session_key)

    if not session.state.phone:
        session.state.phone = phone
    if not session.state.name:
        session.state.name = name
    # Advance stage if still at an early stage
    if session.state.lead_stage in ("new", "exploring", "qualified", "warm"):
        session.state.lead_stage = "captured"
    # Mark that the inline ContactCard (not the widget) was used — gates BookingCard
    if source == "card":
        session.state.contact_card_submitted = True

    save_session(session_key, session)
    save_lead(session_key, session.state)

    return {"status": "saved"}


@app.post("/book-visit", status_code=201)
def book_visit(request: BookingRequest):
    session_id = request.session_id.strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    session = load_session(session_id)
    session.state.visit_date = request.visit_date.strip()
    session.state.visit_time = request.visit_time.strip()
    session.state.visit_status = "pending"

    save_session(session_id, session)
    save_lead(session_id, session.state)

    print(f"[booking] {session.state.name} / {session.state.phone} → {request.visit_date} {request.visit_time}", flush=True)
    return {"status": "booked", "visit_date": session.state.visit_date, "visit_time": session.state.visit_time}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    message = request.message.strip()
    session_id = request.session_id

    session = load_session(session_id)

    if message.lower() in RESET_PHRASES:
        clear_session(session_id)
        return ChatResponse(
            answer="Sure, let's start fresh. Are you exploring for investment or personal use?",
            follow_up_question="What brings you here today?",
            project_bias="neutral",
            lead_stage="new",
            urgency_flag=False,
            language="en",
            cta="Tell me your goal",
            handoff_needed=False,
        )

    # Hard off-topic guard — no LLM call, instant redirect
    if is_off_topic(message):
        off_topic_reply = (
            "मैं Inframantra के Westin Residences और Tulip Monsella का विशेषज्ञ हूँ — "
            "इस विषय पर मैं सही व्यक्ति नहीं हूँ! क्या मैं आपको इन दोनों शानदार प्रॉपर्टीज़ के बारे में बता सकता हूँ?"
            if session.state.language == "hi"
            else "I'm a specialist advisor exclusively for Inframantra's Westin Residences and Tulip Monsella — "
                 "I'm not the right person for that question! "
                 "May I help you explore these two exceptional properties instead?"
        )
        return ChatResponse(
            answer=off_topic_reply,
            follow_up_question="Are you exploring for investment or personal use?",
            project_bias=session.state.project_bias,
            lead_stage=session.state.lead_stage,
            urgency_flag=False,
            language=session.state.language,
            cta="Let's find your ideal home",
            handoff_needed=False,
            ask_contact=False,
        )

    session.state = classify(message, session.state)
    # Lock the engine's stage — LLM cannot downgrade it
    engine_stage = session.state.lead_stage

    urgency = should_trigger_urgency(session.state)
    if urgency:
        session.state.urgency_last_triggered = session.state.messages_count

    source_bias = session.state.project_bias if session.state.project_bias != "neutral" else None
    rag_chunks = retrieve(message, top_k=5, source_bias=source_bias)

    prompt = build_prompt(
        user_message=message,
        state=session.state,
        rag_chunks=rag_chunks,
        history=session.history,
        urgency=urgency,
    )

    try:
        raw_response = chat(prompt)
        response_data = _parse_response(raw_response)
    except Exception as e:
        err = str(e)
        if "content_filter" in err or "content management" in err:
            answer = "I'd prefer to keep our conversation focused on Westin Residences and Tulip Monsella. How can I help you with either of these properties?"
        else:
            answer = "I'm having a brief technical moment — please try again in a few seconds."
        return ChatResponse(
            answer=answer,
            follow_up_question="Are you exploring for investment or personal use?",
            project_bias=session.state.project_bias,
            lead_stage=session.state.lead_stage,
            urgency_flag=False,
            language=session.state.language,
            cta="Explore our properties",
            handoff_needed=False,
            ask_contact=False,
        )

    STAGE_ORDER = ["new", "exploring", "qualified", "warm", "captured", "handed_off"]
    if response_data.get("project_bias") in ("westin", "tulip", "neutral"):
        session.state.project_bias = response_data["project_bias"]
    # LLM may only advance stage, never downgrade — engine is the floor
    llm_stage = response_data.get("lead_stage")
    if llm_stage in STAGE_ORDER:
        engine_idx = STAGE_ORDER.index(engine_stage)
        llm_idx = STAGE_ORDER.index(llm_stage)
        resolved = STAGE_ORDER[max(engine_idx, llm_idx)]
    else:
        resolved = engine_stage

    # Additional guard: LLM cannot jump to captured/handed_off without an actual phone number.
    # Prevents the model from skipping the contact-capture step on its own initiative.
    if resolved in ("captured", "handed_off") and not session.state.phone:
        resolved = engine_stage

    session.state.lead_stage = resolved
    if response_data.get("language") in ("en", "hi"):
        session.state.language = response_data["language"]

    # BUG FIX: sync the engine-corrected stage back into the response so the
    # frontend always receives the floor value, not the LLM's raw (potentially downgraded) stage.
    response_data["lead_stage"] = session.state.lead_stage

    # Extract name from LLM response — always overwrite so explicit "my name is X" corrects any prior wrong value
    if response_data.get("captured_name"):
        session.state.name = response_data["captured_name"]

    session.history.append(ChatMessage(role="user", content=message))
    session.history.append(ChatMessage(role="assistant", content=response_data["answer"]))

    save_session(session_id, session)

    # Save every session to leads.json after every message so partial data is never lost
    save_lead(session_id, session.state)

    # ask_contact: fires at warm stage before phone is captured
    ask_contact = (
        engine_stage == "warm"
        and not session.state.phone
    )

    # ask_booking: fires exactly once — only when name+phone were submitted via the inline
    # ContactCard (contact_card_submitted=True). Never fires if the user typed their
    # details manually or used the floating widget.
    # Suppressed once shown (booking_card_shown) or once booking is submitted (visit_status).
    ask_booking = (
        session.state.contact_card_submitted
        and session.state.lead_stage in ("captured", "handed_off")
        and not ask_contact
        and not bool(session.state.visit_status)
        and not session.state.booking_card_shown
    )

    # Mark as shown so it never fires again, even if user ignores the card
    if ask_booking:
        session.state.booking_card_shown = True
        save_session(session_id, session)

    # Strip internal fields before returning to frontend
    response_data.pop("captured_name", None)
    response_data["ask_contact"] = ask_contact
    response_data["ask_booking"] = ask_booking

    # Don't show suggestions once contact is captured — conversation is done
    if session.state.lead_stage in ("captured", "handed_off"):
        response_data["suggested_replies"] = []

    # Ensure suggested_replies is always a list
    if not isinstance(response_data.get("suggested_replies"), list):
        response_data["suggested_replies"] = []

    return ChatResponse(**response_data)


def _parse_response(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\n?", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse Gemini response as JSON. Raw: {raw[:300]}")
