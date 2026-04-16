# Inframantra ARIA Chatbot — Implementation Summary

## Overview

ARIA is a luxury real estate chatbot for Inframantra, specialising exclusively in two Gurugram properties:
- **Whiteland Westin Residences** — Sector 103, Dwarka Expressway
- **Tulip Monsella** — Sector 53, Golf Course Road

**Stack:** FastAPI (Python) backend · Next.js 14 frontend · Google Gemini LLM · Redis sessions · In-memory RAG · Google Sheets sync

---

## Architecture

```
User Browser (Next.js)
    └── ChatWindow → ChatMessage → ContactCard / BookingCard / HandoffCard
    └── ContactWidget (floating popup)
    └── SuggestedReplies (chip bar above input)

FastAPI Backend
    ├── POST /chat          — main conversation endpoint
    ├── POST /capture-contact — widget & card contact submission
    ├── POST /book-visit    — site visit booking
    └── GET  /brochures/:slug — PDF download (westin-main, westin-docket, tulip)

Core Modules
    ├── core/decision_engine.py   — rule-based lead stage engine
    ├── core/redis_client.py      — session persistence
    ├── core/gemini.py            — Gemini LLM integration
    ├── core/leads.py             — leads.json + contacts.json upsert
    ├── core/sheets.py            — Google Sheets live sync
    └── knowledge/                — RAG ingestion + retrieval
```

---

## Lead Stage Pipeline

Stages progress in one direction only — the engine sets the floor and the LLM can only advance, never downgrade.

```
new → exploring → qualified → warm → captured → handed_off
```

| Stage | Trigger | Action |
|---|---|---|
| `new` | First message | Greeting |
| `exploring` | Message count ≥ 1 | Ask BHK / location |
| `qualified` | BHK known OR project bias set | Deliver property value |
| `warm` | 4+ messages OR visit intent detected | ContactCard appears |
| `captured` | Phone number obtained | HandoffCard + BookingCard appear |
| `handed_off` | Name + phone both known | Warm confirmation, advisor follow-up |

**Key architecture decision:** `engine_stage` is saved before the LLM call. `STAGE_ORDER` ensures the LLM result is only applied if it advances the stage — never if it downgrades it.

---

## Features Implemented

### 1. Conversation Engine (`core/decision_engine.py`)
- Detects **investment vs end-use intent** from keyword signals
- Direct project mention sets `project_bias` immediately (`TULIP_SIGNALS` / `WESTIN_SIGNALS`)
- **BHK extraction** from message (`3 bhk`, `4bhk`, etc.)
- **Budget extraction** via regex (`₹X crore`)
- **Phone extraction** via regex (`[6-9]\d{9}`)
- **Name extraction** — three-tier pattern matching:
  - Explicit: `"my name is X"` / `"mera naam X"` — always overwrites
  - Implicit: `"I am X"` (standalone sentence only)
  - Standalone: `"Chirag Thakur"` (multi-word, title case)
  - Common-word exclusion prevents `"exploring"`, `"looking"` etc. being parsed as names
- **Hindi detection** — 2+ Hindi tokens triggers `language = "hi"`
- **Visit intent detection** — `VISIT_SIGNALS` set (visit, site visit, tour, dekhna, etc.) sets `visit_intent = True` permanently

### 2. System Prompt (`prompts/system_prompt.py`)
- Per-stage instructions injected into every prompt
- `warm` stage: directs ARIA to reference the contact form, never ask verbally
- `captured` stage: mentions booking form naturally once
- `handed_off` stage: reminds of booking form if visit not yet booked
- Global compliance rules: never ask for name/phone in text; never quote exact prices
- `visit_intent` context line passed in every prompt
- RAG context (top 5 chunks, source-biased) injected
- Last 8 messages of conversation history injected
- Off-topic guard (`is_off_topic()`) — instant redirect without LLM call

### 3. RAG Knowledge Base (`knowledge/`)
- PDFs and text files ingested at startup via `build_knowledge_base()`
- Chunks stored in memory with source tag (`westin` / `tulip`) and category
- Cosine similarity retrieval with **source bias boosting** — if `project_bias` is set, same-source chunks score higher
- `top_k=5` chunks retrieved per message

### 4. Session Management (`core/redis_client.py`, `models/session.py`)
- Full `SessionData` (history + state) serialised to Redis per `session_id`
- `UserState` fields: language, intent, bhk_preference, budget_cr, project_bias, lead_stage, name, phone, urgency_eligible, messages_count, value_delivered, urgency_last_triggered, visit_intent, visit_date, visit_time, visit_status

### 5. Lead Capture (`core/leads.py`)
- `save_lead()` — full upsert to `leads/leads.json` after **every** message (partial data never lost)
- Stores: session_id, name, phone, intent, bhk, project_interest, lead_stage, messages_count, first_seen, last_updated, visit_date, visit_time, visit_status
- `save_contact()` — separate log to `leads/contacts.json` for widget submissions

### 6. Google Sheets Sync (`core/sheets.py`)
- Eager init at module import — sheet connection established at startup
- Columns A–M: session_id, name, phone, intent, bhk_preference, project_interest, lead_stage, messages_count, first_seen, last_updated, visit_date, visit_time, visit_status
- `upsert_lead()` — finds row by session_id (column A), updates in place; appends if new
- Runs in **background daemon thread** with `threading.Lock` — never blocks API responses
- Configured via `.env`: `GOOGLE_SHEET_URL`, `GOOGLE_CREDENTIALS_FILE`

### 7. Urgency Engine
- Triggers for: `project_bias == "tulip"` + `bhk_preference == 4` + stage in `(warm, captured)`
- Fires at most once every 3 messages after first trigger
- Injects urgency block into prompt: limited 4BHK supply, advisor-tone (not pushy)

### 8. Brochure Downloads (`main.py`)
- `GET /brochures/westin-main` — Westin Residences main brochure
- `GET /brochures/westin-docket` — Westin CP Docket
- `GET /brochures/tulip` — Tulip Monsella brochure
- Rendered as download strip in chat when project bias is set

---

## Frontend Components (`frontend/`)

### ChatMessage.tsx
- User messages: right-aligned, cream bubble
- Assistant messages: ARIA avatar + gold label + left-border accent
- Project badge shown when bias is westin/tulip
- Follow-up question rendered in italic below answer
- CTA strip rendered via `CTAPrompt`
- **ContactCard** rendered when `message.askContact === true`
- **HandoffCard** rendered when `message.handoffNeeded === true` (once only)
- **BookingCard** rendered when `message.askBooking === true` (once only)
- **BrochureStrip** rendered when project bias is set

### ContactCard
- Inline card in chat — name + phone fields
- On submit: POSTs to `/capture-contact` with `session_id` for session merge
- Then auto-sends `"My name is X and my phone number is Y"` as chat message
- Merges widget contact with existing chat session in backend

### HandoffCard
- Shown once after contact is captured
- Displays "Personal Advisory" confirmation message
- Triggers `handoff_needed: true` from LLM for captured/handed_off stages

### BookingCard (`components/BookingCard.tsx`)
- Date picker: next 7 weekdays (excludes Sundays), displayed as chips
- Time slots: 10 AM – 6 PM in 1-hour increments, 3-column grid
- On submit: POSTs to `/book-visit` with `session_id`, `visit_date`, `visit_time`
- Shows confirmation state after submission
- Backend stores visit details in session + leads.json + Google Sheets

### ContactWidget (`components/ContactWidget.tsx`)
- Floating popup, bottom-right corner
- Triggers after 4 user messages (`TRIGGER_MSG_COUNT = 4`)
- Dismiss state stored in `sessionStorage` (resets each page load)
- POSTs to `/capture-contact` with `session_id`
- Hidden once `leadCaptured === true`

### SuggestedReplies (`components/SuggestedReplies.tsx`)
- Chip buttons above the input bar
- Populated from last assistant message's `suggestedReplies` array (LLM-generated)
- 2–3 chips, max 5 words each, contextually relevant to the follow-up question
- Staggered animation (0.06s delay per chip)
- Disabled during loading
- Cleared once stage reaches `captured` / `handed_off`

### chatStore (`store/chatStore.ts`, Zustand)
- `leadCaptured` — prevents HandoffCard appearing more than once
- `bookingShown` — prevents BookingCard appearing more than once per session
- `sessionId` — persisted to `localStorage` via `getOrCreateSessionId()`
- Both guards reset on chat reset / `start over`

---

## API Response Shape

```typescript
{
  answer: string
  follow_up_question: string
  project_bias: "westin" | "tulip" | "neutral"
  lead_stage: string
  urgency_flag: boolean
  language: "en" | "hi"
  cta: string
  handoff_needed: boolean
  ask_contact: boolean       // ContactCard trigger
  ask_booking: boolean       // BookingCard trigger
  suggested_replies: string[] // chip suggestions
}
```

---

## Booking Flow (End-to-End)

```
1. User expresses visit intent (any stage)
      → visit_intent = True
      → stage accelerates to warm

2a. Phone not yet captured:
      → ask_contact = True → ContactCard appears
      → User submits ContactCard → auto-message with name+phone
      → stage = captured/handed_off
      → ask_booking = True → BookingCard appears

2b. Phone already captured:
      → ask_booking = True → BookingCard appears immediately

3. User submits BookingCard
      → POST /book-visit
      → visit_date, visit_time, visit_status = "pending" saved to session + leads + Sheets
      → ask_booking suppressed for all subsequent messages (visit_status is set)
      → bookingShown = true in frontend store (card never re-appears)
```

---

## Environment Variables (`.env`)

```
GEMINI_API_KEY=...
REDIS_URL=redis://localhost:6379
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/...
GOOGLE_CREDENTIALS_FILE=credentials.json
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Known Safeguards

| Safeguard | Implementation |
|---|---|
| LLM cannot downgrade lead stage | `STAGE_ORDER` + `engine_stage` floor in `main.py` |
| LLM cannot ask for contact verbally | Global compliance rule in system prompt |
| LLM stage output ignored if invalid | Falls back to `engine_stage` |
| Name "exploring" / "looking" not saved | `_COMMON_WORDS` exclusion set |
| Duplicate HandoffCard | `leadCaptured` guard in chatStore |
| Duplicate BookingCard | `bookingShown` guard + `visit_status` backend check |
| Off-topic questions | `is_off_topic()` instant redirect, no LLM call |
| Content filter errors | Caught, returns polite redirect response |
