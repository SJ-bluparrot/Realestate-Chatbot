# Inframantra Luxury Real Estate Chatbot — Design Spec
**Date:** 2026-04-10  
**Status:** Approved  
**Scope:** Backend API only (`/chat` endpoint), local Mac deployment, frontend integration later

---

## 1. Objective

Build a proactive, intelligent luxury real estate chatbot API that:
- Converts website visitors into qualified leads (name + phone)
- Acts as a sales closer, not a FAQ bot
- Provides consultative guidance comparing Westin Residences and Tulip Monsella
- Maintains session context via Redis
- Operates with a premium concierge persona ("Aryan")

---

## 2. Tech Stack

| Component | Choice | Reason |
|---|---|---|
| Language | Python 3.11+ | Best AI/LLM ecosystem |
| Framework | FastAPI | Async, fast, clean API contracts |
| LLM | Gemini (`gemini-1.5-flash`) | Already licensed, chat + embeddings |
| Embeddings | Gemini `text-embedding-004` | Free with Gemini API key, 768-dim |
| Vector Search | In-memory (numpy cosine similarity) | No external dependency, ~150 chunks total |
| Session Memory | Redis (local, `brew install redis`) | Fast, persistent across requests |
| PDF Parsing | `pypdf` | Lightweight, no external service |

**Environment variables (`.env`):**
```
GEMINI_API_KEY=...
REDIS_URL=redis://localhost:6379
```

---

## 3. Project Structure

```
inframantra-chatbot/
├── main.py                  # FastAPI app — /chat and /health endpoints
├── .env                     # API keys (gitignored)
├── .gitignore
├── requirements.txt
│
├── core/
│   ├── gemini.py            # Gemini client: chat() and embed()
│   ├── redis_client.py      # Session read/write helpers
│   └── decision_engine.py   # User classification, lead stage, urgency logic
│
├── knowledge/
│   ├── ingest.py            # One-time: loads all sources, chunks, embeds, stores in memory
│   └── retriever.py         # RAG: cosine search over in-memory embeddings
│
├── models/
│   ├── session.py           # Pydantic: UserState, SessionData, ChatMessage
│   └── response.py          # Pydantic: ChatResponse
│
└── prompts/
    └── system_prompt.py     # Dynamic system prompt builder
```

---

## 4. Knowledge Base (RAG)

### Sources
- `Gemini-Research.txt/research.txt` — full analytical content (pricing, specs, investment data, comparisons)
- `Tupil-Monsella-PDF's/brochure small.pdf`
- `Westin-Residences-Brochure/The Westin Residences, Gurugram.pdf`
- `Westin-Residences-Brochure/Westin-Residences-Gurugram-WhatsApp-CP Docket.pdf`

### Ingestion (runs at server startup)
1. Parse PDFs with `pypdf`, read research.txt directly
2. Chunk into ~400-token segments with 50-token overlap
3. Embed each chunk with Gemini `text-embedding-004`
4. Store as list of `{text, embedding, source, category}` in memory

### Metadata tags per chunk
- `source`: `"westin"` | `"tulip"` | `"research"`
- `category`: `"pricing"` | `"amenities"` | `"location"` | `"specs"` | `"investment"` | `"security"`

### Query-time retrieval
- Embed user message
- Cosine similarity against all stored chunks
- Return top 5 chunks
- If `project_bias` is set, boost chunks matching that source (but always include ≥1 research chunk)
- Inject as `[KNOWLEDGE BASE]` section in system prompt

---

## 5. Session Memory (Redis)

### Key structure
```
session:{session_id}:history   → list of last 8 messages [{role, content}]
session:{session_id}:state     → UserState JSON
```

### UserState schema
```python
{
  "language": "en" | "hi",
  "intent": "investment" | "end-use" | "unknown",
  "bhk_preference": 3 | 4 | 5 | None,
  "budget_cr": float | None,
  "project_bias": "westin" | "tulip" | "neutral",
  "lead_stage": "new" | "exploring" | "qualified" | "warm" | "captured" | "handed_off",
  "name": str | None,
  "phone": str | None,
  "urgency_eligible": bool,
  "messages_count": int,
  "value_delivered": bool,
  "urgency_last_triggered": int | None   # message index, for anti-spam
}
```

### Reset trigger
If user message matches: `reset`, `start over`, `clear chat`, `shuru karo`  
→ Delete both Redis keys → Return: *"Sure, let's start fresh. Are you exploring for investment or end-use?"*

---

## 6. Decision Engine

Pure Python logic. Runs on every request before the LLM call.

### Intent & bias classification (keyword matching)
| Signal | Action |
|---|---|
| "invest", "ROI", "appreciation", "rental", "NRI", "returns" | intent=investment, bias→westin |
| "family", "kids", "school", "live in", "end use", "ghar" | intent=end-use, bias→tulip |
| "4 BHK" or "4bhk" | bhk_preference=4 |
| "3 BHK" or "3bhk" | bhk_preference=3 |
| "5 BHK" or "5bhk" | bhk_preference=5 |
| Hindi words detected (≥2 Hindi tokens) | language=hi |
| 10-digit phone pattern matched | phone=captured, stage→captured |

### Lead stage transitions
```
new         → exploring    after first substantive exchange (messages_count >= 1)
exploring   → qualified    after intent + BHK both known
qualified   → warm         after budget signal OR deep comparison question
warm        → captured     after phone number received
captured    → handed_off   after name also received
```

### Urgency gate (ALL must be true)
- `project_bias == "tulip"`
- `bhk_preference == 4`
- `lead_stage in ["warm", "captured"]`
- `urgency_last_triggered is None OR messages_count - urgency_last_triggered > 3` (anti-spam: not in last 3 messages)

---

## 7. System Prompt (Dynamic)

Built fresh every request. Structure:

```
[PERSONA]
You are Aryan, a senior luxury real estate advisor at Inframantra...
{language_instruction}

[COMPLIANCE RULES]
- Marriott manages Westin but is NOT the developer
- Never guarantee investment returns
- Never confirm specific unit availability
- Use price ranges only; never fabricate exact figures
- Do not ask for phone number before delivering value

[USER CONTEXT]
Intent: {intent} | BHK: {bhk_preference} | Stage: {lead_stage}
Project interest: {project_bias} | Name: {name}

[LEAD STAGE INSTRUCTIONS]
{stage-specific instructions injected here}

[URGENCY INSTRUCTION — only if urgency_eligible=True]
Mention that Tulip Monsella 4BHK units are in very limited supply. Use once, naturally.

[KNOWLEDGE BASE — ANSWER ONLY FROM THIS]
{top 5 RAG chunks}

[CONVERSATION HISTORY]
{last 8 messages}

[CURRENT MESSAGE]
{user_message}

Reply ONLY as valid JSON matching the ChatResponse schema.
```

---

## 8. API Contract

### `POST /chat`
**Request:**
```json
{
  "message": "string",
  "session_id": "string"
}
```

**Response:**
```json
{
  "answer": "string",
  "follow_up_question": "string",
  "project_bias": "westin | tulip | neutral",
  "lead_stage": "string",
  "urgency_flag": false,
  "language": "en | hi",
  "cta": "string",
  "handoff_needed": false
}
```

### `GET /health`
Returns server status, Redis connectivity, and knowledge base chunk count.

```json
{
  "status": "ok",
  "redis": "connected",
  "knowledge_chunks": 142
}
```

---

## 9. Request Lifecycle (Full Pipeline)

```
1.  RECEIVE     → Parse {message, session_id}
2.  REDIS       → Load history + UserState (or initialize fresh state)
3.  RESET?      → If reset keyword → clear Redis → return restart message
4.  DETECT      → Language detection → update state.language
5.  CLASSIFY    → Decision engine → update intent, BHK, bias, lead stage, urgency_eligible
6.  RAG         → Embed message → cosine search → retrieve top 5 chunks
7.  PROMPT      → Build dynamic system prompt with all context
8.  GEMINI      → Send prompt → receive raw response
9.  PARSE       → Extract JSON from Gemini response
10. VALIDATE    → Safety checks (urgency gate, no premature phone ask, no hallucinated data)
11. REDIS SAVE  → Append message to history, save updated state
12. RETURN      → Send ChatResponse JSON
```

---

## 10. Conversation Flow

| Step | Trigger | Chatbot Action |
|---|---|---|
| Greeting | New session | "Are you exploring for investment or end-use?" |
| Qualification | Stage: exploring | Ask BHK preference |
| Qualification | Stage: exploring | Ask location preference (Dwarka Expy vs Golf Course Rd) |
| Value delivery | Stage: qualified | Compare projects, share insights |
| Lead capture | value_delivered=True, stage: warm | "I can share the best available options. May I have your name and number?" |
| Retry | Phone not given | Acknowledge, continue helping, retry once more later |
| Handoff | Stage: captured | Set handoff_needed=True |

---

## 11. Compliance Rules

- Marriott is the **management partner**, not the developer of Westin Residences
- Never guarantee ROI or rental yield as fixed figures
- Never confirm specific floor/unit availability
- Provide price **ranges** only (e.g., ₹5.75–7.57 Cr for 3 BHK Westin)
- Never recommend one project as objectively "better" — always frame as "better fit for your needs"

---

## 12. Failure Conditions (Must Avoid)

- Asking for phone before `value_delivered = True`
- Repeating a question already answered in session history
- Urgency used for Westin or for stages below `warm`
- Urgency triggered more than once per 3 messages
- Hallucinated pricing, RERA numbers, or availability
- Generic FAQ-style responses without follow-up questions
- Breaking out of JSON response format

---

## 13. Success Criteria

The chatbot succeeds if:
- It feels like a human luxury consultant, not a bot
- It guides users from cold → qualified → lead without feeling pushy
- It delivers accurate, brochure-backed information
- It captures name + phone for ≥30% of engaged sessions
- It handles both projects seamlessly in one conversation
- Hindi users receive fluent, natural Hindi responses
