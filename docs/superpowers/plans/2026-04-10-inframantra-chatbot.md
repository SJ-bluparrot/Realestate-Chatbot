# Inframantra Luxury Real Estate Chatbot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI backend with a `/chat` endpoint that acts as a luxury real estate sales advisor for Inframantra, using Gemini LLM, in-memory RAG from property brochures, and Redis session memory.

**Architecture:** Single FastAPI app with a decision engine (pure Python), in-memory vector store (numpy cosine similarity over Gemini embeddings), and Redis for session state. All knowledge is loaded from local PDFs and research.txt at startup.

**Tech Stack:** Python 3.11+, FastAPI, google-generativeai, Redis (redis-py), pypdf, numpy, python-dotenv, pydantic v2, pytest

---

## File Map

| File | Responsibility |
|---|---|
| `main.py` | FastAPI app, `/chat` and `/health` endpoints, request pipeline |
| `core/gemini.py` | Gemini API client — `embed()` and `chat()` |
| `core/redis_client.py` | Redis session helpers — `load_session`, `save_session`, `clear_session` |
| `core/decision_engine.py` | Pure Python classifier — intent, BHK, language, lead stage, urgency |
| `knowledge/ingest.py` | Startup loader — reads PDFs + research.txt, chunks, embeds |
| `knowledge/retriever.py` | In-memory cosine search — `load()`, `retrieve()` |
| `models/session.py` | Pydantic models: `UserState`, `ChatMessage`, `SessionData` |
| `models/response.py` | Pydantic model: `ChatResponse` |
| `prompts/system_prompt.py` | Dynamic prompt builder |
| `tests/test_decision_engine.py` | Unit tests for classifier |
| `tests/test_retriever.py` | Unit tests for RAG retriever |
| `tests/test_system_prompt.py` | Unit tests for prompt builder |
| `tests/test_chat_endpoint.py` | Integration tests for `/chat` and `/health` |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `.gitignore`
- Create: `core/__init__.py`
- Create: `knowledge/__init__.py`
- Create: `models/__init__.py`
- Create: `prompts/__init__.py`
- Create: `tests/__init__.py`

- [ ] **Step 1: Install Redis via Homebrew**

```bash
brew install redis
brew services start redis
redis-cli ping
```
Expected output: `PONG`

- [ ] **Step 2: Create requirements.txt**

```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
google-generativeai>=0.5.0
redis>=5.0.0
pypdf>=4.0.0
numpy>=1.26.0
python-dotenv>=1.0.0
pydantic>=2.6.0
pytest>=8.0.0
httpx>=0.27.0
```

- [ ] **Step 3: Create virtual environment and install dependencies**

```bash
cd "/Users/sam/Desktop/inframantra chatbot"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Expected: all packages install without errors.

- [ ] **Step 4: Create .gitignore**

```
venv/
__pycache__/
*.pyc
.env
*.egg-info/
.pytest_cache/
```

- [ ] **Step 5: Update .env with both keys**

Ensure `/Users/sam/Desktop/inframantra chatbot/.env` contains:
```
GEMINI_API_KEY=AIzaSyBiKtvKKHkSW-BjvgziachCs2RwZUPKPUA
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 6: Create empty __init__.py files**

Create these four empty files:
- `core/__init__.py`
- `knowledge/__init__.py`
- `models/__init__.py`
- `prompts/__init__.py`
- `tests/__init__.py`

- [ ] **Step 7: Commit**

```bash
git init
git add requirements.txt .gitignore core/__init__.py knowledge/__init__.py models/__init__.py prompts/__init__.py tests/__init__.py
git commit -m "chore: project scaffolding"
```

---

## Task 2: Pydantic Models

**Files:**
- Create: `models/session.py`
- Create: `models/response.py`

- [ ] **Step 1: Create models/session.py**

```python
from pydantic import BaseModel
from typing import Optional, Literal


class UserState(BaseModel):
    language: Literal["en", "hi"] = "en"
    intent: Literal["investment", "end-use", "unknown"] = "unknown"
    bhk_preference: Optional[int] = None
    budget_cr: Optional[float] = None
    project_bias: Literal["westin", "tulip", "neutral"] = "neutral"
    lead_stage: Literal["new", "exploring", "qualified", "warm", "captured", "handed_off"] = "new"
    name: Optional[str] = None
    phone: Optional[str] = None
    urgency_eligible: bool = False
    messages_count: int = 0
    value_delivered: bool = False
    urgency_last_triggered: Optional[int] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class SessionData(BaseModel):
    history: list[ChatMessage] = []
    state: UserState = UserState()
```

- [ ] **Step 2: Create models/response.py**

```python
from pydantic import BaseModel
from typing import Literal


class ChatResponse(BaseModel):
    answer: str
    follow_up_question: str
    project_bias: Literal["westin", "tulip", "neutral"]
    lead_stage: str
    urgency_flag: bool
    language: Literal["en", "hi"]
    cta: str
    handoff_needed: bool
```

- [ ] **Step 3: Verify models load without errors**

```bash
source venv/bin/activate
python3 -c "from models.session import UserState, SessionData; from models.response import ChatResponse; print('Models OK')"
```
Expected: `Models OK`

- [ ] **Step 4: Commit**

```bash
git add models/session.py models/response.py
git commit -m "feat: add pydantic models for session and response"
```

---

## Task 3: Decision Engine (TDD)

**Files:**
- Create: `tests/test_decision_engine.py`
- Create: `core/decision_engine.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_decision_engine.py`:

```python
from core.decision_engine import classify, should_trigger_urgency
from models.session import UserState


def test_classify_investment_intent():
    state = UserState()
    result = classify("I am looking for ROI and investment returns", state)
    assert result.intent == "investment"
    assert result.project_bias == "westin"


def test_classify_end_use_intent():
    state = UserState()
    result = classify("I have a family with kids and want to live in", state)
    assert result.intent == "end-use"
    assert result.project_bias == "tulip"


def test_classify_hindi_language():
    state = UserState()
    result = classify("Mujhe kya chahiye hai batao aap", state)
    assert result.language == "hi"


def test_classify_bhk_4():
    state = UserState()
    result = classify("I want a 4 BHK apartment", state)
    assert result.bhk_preference == 4


def test_classify_bhk_3():
    state = UserState()
    result = classify("Looking for 3bhk", state)
    assert result.bhk_preference == 3


def test_classify_phone_number():
    state = UserState()
    result = classify("My number is 9876543210", state)
    assert result.phone == "9876543210"


def test_classify_phone_not_captured_for_invalid_number():
    state = UserState()
    result = classify("Call me at 12345", state)
    assert result.phone is None


def test_classify_budget_from_message():
    state = UserState()
    result = classify("My budget is 10 crore", state)
    assert result.budget_cr == 10.0


def test_lead_stage_exploring_after_first_message():
    state = UserState()
    result = classify("Hello", state)
    assert result.lead_stage == "exploring"


def test_lead_stage_qualified_after_intent_and_bhk():
    state = UserState(intent="investment", lead_stage="exploring", messages_count=2)
    result = classify("I want 4 BHK", state)
    assert result.lead_stage == "qualified"


def test_lead_stage_captured_after_phone():
    state = UserState(intent="end-use", bhk_preference=3, lead_stage="warm", messages_count=5)
    result = classify("My number is 9876543210", state)
    assert result.lead_stage == "captured"
    assert result.phone == "9876543210"


def test_urgency_not_triggered_for_westin():
    state = UserState(project_bias="westin", bhk_preference=4, lead_stage="warm")
    assert should_trigger_urgency(state) is False


def test_urgency_not_triggered_below_warm_stage():
    state = UserState(project_bias="tulip", bhk_preference=4, lead_stage="qualified")
    assert should_trigger_urgency(state) is False


def test_urgency_not_triggered_for_non_4bhk():
    state = UserState(project_bias="tulip", bhk_preference=3, lead_stage="warm")
    assert should_trigger_urgency(state) is False


def test_urgency_triggered_for_tulip_4bhk_warm():
    state = UserState(project_bias="tulip", bhk_preference=4, lead_stage="warm")
    assert should_trigger_urgency(state) is True


def test_urgency_anti_spam_within_3_messages():
    state = UserState(
        project_bias="tulip", bhk_preference=4, lead_stage="warm",
        urgency_last_triggered=5, messages_count=7
    )
    assert should_trigger_urgency(state) is False


def test_urgency_allowed_after_3_messages():
    state = UserState(
        project_bias="tulip", bhk_preference=4, lead_stage="warm",
        urgency_last_triggered=3, messages_count=7
    )
    assert should_trigger_urgency(state) is True
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
source venv/bin/activate
pytest tests/test_decision_engine.py -v 2>&1 | head -30
```
Expected: `ModuleNotFoundError` or `ImportError` — no `decision_engine` yet.

- [ ] **Step 3: Create core/decision_engine.py**

```python
import re
from models.session import UserState

INVESTMENT_SIGNALS = {"invest", "roi", "appreciation", "rental", "nri", "returns", "yield", "portfolio"}
END_USE_SIGNALS = {"family", "kids", "school", "live in", "end use", "ghar", "rehna", "children"}
HINDI_TOKENS = {
    "hai", "hain", "kya", "mujhe", "aap", "nahi", "batao", "chahiye",
    "kaisa", "kab", "kahan", "kyun", "theek", "accha", "bahut", "hanji",
    "bhai", "yaar", "bilkul", "zaroor", "samjha", "dekhte"
}


def classify(message: str, state: UserState) -> UserState:
    msg_lower = message.lower()
    words = set(msg_lower.split())

    # Language detection
    if len(words & HINDI_TOKENS) >= 2:
        state.language = "hi"

    # Intent and bias classification
    if any(signal in msg_lower for signal in INVESTMENT_SIGNALS):
        state.intent = "investment"
        if state.project_bias == "neutral":
            state.project_bias = "westin"

    if any(signal in msg_lower for signal in END_USE_SIGNALS):
        state.intent = "end-use"
        if state.project_bias == "neutral":
            state.project_bias = "tulip"

    # BHK preference
    for bhk in [3, 4, 5]:
        if f"{bhk} bhk" in msg_lower or f"{bhk}bhk" in msg_lower:
            state.bhk_preference = bhk
            break

    # Budget detection (e.g. "10 crore", "8cr", "8.5 cr")
    budget_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:cr|crore)', msg_lower)
    if budget_match:
        state.budget_cr = float(budget_match.group(1))

    # Phone capture — Indian mobile numbers start with 6-9, exactly 10 digits
    phone_match = re.search(r'\b[6-9]\d{9}\b', message)
    if phone_match and not state.phone:
        state.phone = phone_match.group()

    # Increment message count
    state.messages_count += 1

    # Lead stage transitions
    state = _advance_lead_stage(state)

    # Urgency eligibility (computed, not triggered here)
    state.urgency_eligible = _is_urgency_eligible(state)

    return state


def _advance_lead_stage(state: UserState) -> UserState:
    if state.lead_stage == "new" and state.messages_count >= 1:
        state.lead_stage = "exploring"

    if state.lead_stage == "exploring" and state.intent != "unknown" and state.bhk_preference is not None:
        state.lead_stage = "qualified"

    if state.lead_stage == "qualified" and (state.budget_cr is not None or state.messages_count >= 5):
        state.lead_stage = "warm"

    if state.lead_stage == "warm" and state.phone:
        state.lead_stage = "captured"

    if state.lead_stage == "captured" and state.name:
        state.lead_stage = "handed_off"

    return state


def _is_urgency_eligible(state: UserState) -> bool:
    return (
        state.project_bias == "tulip"
        and state.bhk_preference == 4
        and state.lead_stage in ("warm", "captured")
    )


def should_trigger_urgency(state: UserState) -> bool:
    if not state.urgency_eligible:
        return False
    if state.urgency_last_triggered is None:
        return True
    return (state.messages_count - state.urgency_last_triggered) > 3
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pytest tests/test_decision_engine.py -v
```
Expected: all 17 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add core/decision_engine.py tests/test_decision_engine.py
git commit -m "feat: decision engine with intent classification, lead stage tracking, urgency logic"
```

---

## Task 4: RAG Retriever (TDD)

**Files:**
- Create: `tests/test_retriever.py`
- Create: `knowledge/retriever.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_retriever.py`:

```python
import numpy as np
from unittest.mock import patch
from knowledge.retriever import load, retrieve, chunk_count, _cosine_similarity


MOCK_CHUNKS = [
    {
        "text": "Westin Residences pricing starts at 5.75 Crore for 3 BHK",
        "embedding": np.array([1.0, 0.0, 0.0], dtype=np.float32),
        "source": "westin",
        "category": "pricing",
    },
    {
        "text": "Tulip Monsella 4 BHK units priced from 11.25 Crore",
        "embedding": np.array([0.0, 1.0, 0.0], dtype=np.float32),
        "source": "tulip",
        "category": "pricing",
    },
    {
        "text": "Golf Course Road appreciation forecast 8-10% CAGR",
        "embedding": np.array([0.0, 0.0, 1.0], dtype=np.float32),
        "source": "research",
        "category": "investment",
    },
]


def test_load_sets_chunk_count():
    load(MOCK_CHUNKS)
    assert chunk_count() == 3


def test_retrieve_returns_top_k():
    load(MOCK_CHUNKS)
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("Westin price", top_k=2)
    assert len(results) == 2


def test_retrieve_first_result_most_similar():
    load(MOCK_CHUNKS)
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("Westin price", top_k=3)
    assert results[0]["source"] == "westin"


def test_retrieve_source_bias_boosts_matching_chunks():
    load(MOCK_CHUNKS)
    # Query embedding is neutral (equal similarity to all)
    with patch("knowledge.retriever.embed", return_value=[0.577, 0.577, 0.577]):
        results = retrieve("property details", top_k=2, source_bias="tulip")
    assert results[0]["source"] == "tulip"


def test_retrieve_ensures_research_chunk_with_bias():
    load(MOCK_CHUNKS)
    # Query points directly at westin, but research must appear in top_k
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("Westin price", top_k=2, source_bias="westin")
    sources = [r["source"] for r in results]
    assert "research" in sources


def test_retrieve_returns_empty_when_not_loaded():
    load([])
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("anything")
    assert results == []


def test_cosine_similarity_identical_vectors():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    assert abs(_cosine_similarity(a, a) - 1.0) < 1e-6


def test_cosine_similarity_orthogonal_vectors():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    assert abs(_cosine_similarity(a, b)) < 1e-6


def test_cosine_similarity_zero_vector():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 0.0, 0.0], dtype=np.float32)
    assert _cosine_similarity(a, b) == 0.0
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pytest tests/test_retriever.py -v 2>&1 | head -20
```
Expected: `ImportError` — no retriever yet.

- [ ] **Step 3: Create knowledge/retriever.py**

```python
import numpy as np
from core.gemini import embed

_knowledge_base: list[dict] = []


def load(chunks: list[dict]) -> None:
    global _knowledge_base
    _knowledge_base = chunks


def retrieve(query: str, top_k: int = 5, source_bias: str | None = None) -> list[dict]:
    if not _knowledge_base:
        return []

    query_embedding = np.array(embed(query), dtype=np.float32)

    scored = []
    for chunk in _knowledge_base:
        score = _cosine_similarity(query_embedding, chunk["embedding"])
        if source_bias and chunk["source"] == source_bias:
            score *= 1.3
        scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [c for _, c in scored[:top_k]]

    # Guarantee at least one research chunk when a source bias is applied
    if source_bias and not any(c["source"] == "research" for c in top_chunks):
        research_candidates = [(s, c) for s, c in scored if c["source"] == "research"]
        if research_candidates:
            top_chunks[-1] = research_candidates[0][1]

    return top_chunks


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a)) * float(np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def chunk_count() -> int:
    return len(_knowledge_base)
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pytest tests/test_retriever.py -v
```
Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add knowledge/retriever.py tests/test_retriever.py
git commit -m "feat: in-memory RAG retriever with cosine similarity and source bias"
```

---

## Task 5: System Prompt Builder (TDD)

**Files:**
- Create: `tests/test_system_prompt.py`
- Create: `prompts/system_prompt.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_system_prompt.py`:

```python
from prompts.system_prompt import build
from models.session import UserState, ChatMessage


def test_prompt_contains_investment_intent():
    state = UserState(intent="investment", project_bias="westin")
    prompt = build("Tell me about Westin", state, [], [], False)
    assert "investment" in prompt


def test_prompt_contains_project_bias():
    state = UserState(project_bias="westin")
    prompt = build("pricing?", state, [], [], False)
    assert "westin" in prompt.lower()


def test_prompt_contains_hindi_instruction():
    state = UserState(language="hi")
    prompt = build("Batao", state, [], [], False)
    assert "Hindi" in prompt


def test_prompt_contains_english_instruction():
    state = UserState(language="en")
    prompt = build("Hello", state, [], [], False)
    assert "English" in prompt


def test_prompt_includes_urgency_block_when_true():
    state = UserState(project_bias="tulip", bhk_preference=4, lead_stage="warm")
    prompt = build("interested", state, [], [], True)
    assert "URGENCY" in prompt
    assert "limited" in prompt.lower()


def test_prompt_excludes_urgency_block_when_false():
    state = UserState()
    prompt = build("Hello", state, [], [], False)
    assert "URGENCY" not in prompt


def test_prompt_includes_rag_context():
    state = UserState()
    chunks = [{"text": "Westin starts at 5.75 Cr", "source": "westin", "category": "pricing"}]
    prompt = build("price?", state, chunks, [], False)
    assert "5.75" in prompt


def test_prompt_includes_conversation_history():
    state = UserState()
    history = [
        ChatMessage(role="user", content="Hello there"),
        ChatMessage(role="assistant", content="Welcome to Inframantra"),
    ]
    prompt = build("Tell me more", state, [], history, False)
    assert "Hello there" in prompt
    assert "Welcome to Inframantra" in prompt


def test_prompt_contains_compliance_rules():
    state = UserState()
    prompt = build("Is Marriott the developer?", state, [], [], False)
    assert "Marriott" in prompt
    assert "NOT the developer" in prompt or "management partner" in prompt.lower()


def test_prompt_ends_with_json_instruction():
    state = UserState()
    prompt = build("Hi", state, [], [], False)
    assert "JSON" in prompt
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pytest tests/test_system_prompt.py -v 2>&1 | head -20
```
Expected: `ImportError` — no system_prompt yet.

- [ ] **Step 3: Create prompts/system_prompt.py**

```python
from models.session import UserState, ChatMessage

_STAGE_INSTRUCTIONS: dict[str, str] = {
    "new": (
        "This is the user's first message. Greet them warmly and ask: "
        "'Are you exploring for investment or personal use?'"
    ),
    "exploring": (
        "Ask about their BHK preference if not already known. "
        "Ask about location preference (Dwarka Expressway vs Golf Course Road) if relevant."
    ),
    "qualified": (
        "Deliver substantive value: compare the two projects on specs relevant to the user's intent. "
        "Highlight key differentiators. Set value_delivered=true in your response reasoning."
    ),
    "warm": (
        "After delivering more insight, transition naturally to: "
        "'I can arrange a personalised briefing for you. "
        "May I have your name and contact number?'"
    ),
    "captured": (
        "Phone captured. Thank them warmly and confirm someone from the advisory team will reach out. "
        "Ask for their name if not already known. Set handoff_needed=true in your response."
    ),
    "handed_off": (
        "Lead fully captured. Provide any final information they need. "
        "Keep tone warm and confirmatory."
    ),
}


def build(
    user_message: str,
    state: UserState,
    rag_chunks: list[dict],
    history: list[ChatMessage],
    urgency: bool,
) -> str:
    language_instruction = (
        "Respond entirely in Hindi — natural, conversational, not formal."
        if state.language == "hi"
        else "Respond in English."
    )

    stage_instruction = _STAGE_INSTRUCTIONS.get(state.lead_stage, "")

    rag_context = "\n\n".join(
        f"[Source: {c['source'].upper()} | Category: {c['category']}]\n{c['text']}"
        for c in rag_chunks
    ) or "No specific context retrieved."

    history_text = "\n".join(
        f"{m.role.upper()}: {m.content}" for m in history[-8:]
    ) or "No prior conversation."

    urgency_block = (
        "\n[URGENCY]\n"
        "Tulip Monsella 4BHK units are in very limited supply. "
        "Mention this once, naturally, as a concerned advisor would — not as a hard sell."
        if urgency
        else ""
    )

    name_display = state.name or "unknown"
    budget_display = f"₹{state.budget_cr} Cr" if state.budget_cr else "unknown"

    return f"""You are Aryan, a senior luxury real estate advisor at Inframantra. You represent two world-class residential properties in Gurugram: Whiteland Westin Residences (Sector 103, Dwarka Expressway) and Tulip Monsella (Sector 53, Golf Course Road).

[PERSONA]
- Speak like a trusted senior consultant, not a brochure
- Be warm, intelligent, and consultative — never pushy or repetitive
- Never say you are an AI
- {language_instruction}

[COMPLIANCE RULES]
- Whiteland Corporation is the developer of Westin Residences. Marriott is the management partner — NOT the developer.
- Never guarantee investment returns or rental yield as fixed figures
- Never confirm specific floor or unit availability
- Use price ranges only — never fabricate exact figures
- Do not ask for phone number before delivering substantive value
- Never say one project is objectively better — always frame as "better fit for your needs"

[USER CONTEXT]
Intent: {state.intent} | BHK preference: {state.bhk_preference or 'unknown'} | Budget: {budget_display}
Project interest: {state.project_bias} | Lead stage: {state.lead_stage} | Name: {name_display}

[CURRENT STAGE INSTRUCTION]
{stage_instruction}
{urgency_block}

[KNOWLEDGE BASE — ANSWER ONLY FROM THIS CONTEXT. DO NOT INVENT FACTS.]
{rag_context}

[CONVERSATION HISTORY]
{history_text}

[USER'S CURRENT MESSAGE]
{user_message}

Respond ONLY as a single valid JSON object with exactly these keys:
{{
  "answer": "your full, consultative response to the user",
  "follow_up_question": "one natural follow-up question to continue the conversation",
  "project_bias": "westin or tulip or neutral",
  "lead_stage": "the lead stage after this exchange",
  "urgency_flag": false,
  "language": "en or hi",
  "cta": "short call-to-action phrase (e.g. 'Schedule a site visit')",
  "handoff_needed": false
}}

Do not include any text outside the JSON object. Do not use markdown code fences."""
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pytest tests/test_system_prompt.py -v
```
Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add prompts/system_prompt.py tests/test_system_prompt.py
git commit -m "feat: dynamic system prompt builder with RAG injection and urgency control"
```

---

## Task 6: Gemini Client

**Files:**
- Create: `core/gemini.py`

No unit tests here — Gemini is an external API. Tested via integration in Task 9.

- [ ] **Step 1: Create core/gemini.py**

```python
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

_chat_model = genai.GenerativeModel("gemini-1.5-flash")


def embed(text: str) -> list[float]:
    """Return 768-dimension embedding for text using text-embedding-004."""
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


def chat(prompt: str) -> str:
    """Send a prompt to Gemini and return the raw text response."""
    response = _chat_model.generate_content(prompt)
    return response.text
```

- [ ] **Step 2: Smoke-test the Gemini connection**

```bash
source venv/bin/activate
python3 -c "
from core.gemini import embed, chat
vec = embed('test')
print(f'Embedding length: {len(vec)}')
print('Embedding OK')
"
```
Expected: `Embedding length: 768` and `Embedding OK`

- [ ] **Step 3: Commit**

```bash
git add core/gemini.py
git commit -m "feat: Gemini client for chat and embeddings"
```

---

## Task 7: Redis Session Client

**Files:**
- Create: `core/redis_client.py`

- [ ] **Step 1: Verify Redis is running**

```bash
redis-cli ping
```
Expected: `PONG`. If not: `brew services start redis`

- [ ] **Step 2: Create core/redis_client.py**

```python
import json
import os
import redis as redis_lib
from dotenv import load_dotenv
from models.session import SessionData, UserState, ChatMessage

load_dotenv()


def get_redis() -> redis_lib.Redis:
    return redis_lib.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))


def load_session(session_id: str) -> SessionData:
    r = get_redis()
    raw_history = r.get(f"session:{session_id}:history")
    raw_state = r.get(f"session:{session_id}:state")

    history = [ChatMessage(**m) for m in json.loads(raw_history)] if raw_history else []
    state = UserState(**json.loads(raw_state)) if raw_state else UserState()

    return SessionData(history=history, state=state)


def save_session(session_id: str, data: SessionData) -> None:
    r = get_redis()
    # Keep only last 8 messages
    messages = data.history[-8:]
    r.set(
        f"session:{session_id}:history",
        json.dumps([m.model_dump() for m in messages]),
    )
    r.set(
        f"session:{session_id}:state",
        json.dumps(data.state.model_dump()),
    )


def clear_session(session_id: str) -> None:
    r = get_redis()
    r.delete(f"session:{session_id}:history")
    r.delete(f"session:{session_id}:state")
```

- [ ] **Step 3: Smoke-test Redis client**

```bash
source venv/bin/activate
python3 -c "
from core.redis_client import load_session, save_session, clear_session
from models.session import SessionData, UserState

sid = 'test-smoke'
data = SessionData(state=UserState(intent='investment'))
save_session(sid, data)
loaded = load_session(sid)
print(f'Intent: {loaded.state.intent}')
clear_session(sid)
print('Redis client OK')
"
```
Expected: `Intent: investment` then `Redis client OK`

- [ ] **Step 4: Commit**

```bash
git add core/redis_client.py
git commit -m "feat: Redis session client with load, save, clear"
```

---

## Task 8: Knowledge Base Ingestion

**Files:**
- Create: `knowledge/ingest.py`

- [ ] **Step 1: Create knowledge/ingest.py**

```python
import os
import numpy as np
from pathlib import Path
from pypdf import PdfReader
from core.gemini import embed

BASE_DIR = Path(__file__).parent.parent

SOURCES = [
    {
        "path": BASE_DIR / "Gemini-Research.txt" / "research.txt",
        "source": "research",
        "file_type": "text",
    },
    {
        "path": BASE_DIR / "Tupil-Monsella-PDF's" / "brochure small.pdf",
        "source": "tulip",
        "file_type": "pdf",
    },
    {
        "path": BASE_DIR / "Westin-Residences-Brochure" / "The Westin Residences, Gurugram.pdf",
        "source": "westin",
        "file_type": "pdf",
    },
    {
        "path": BASE_DIR / "Westin-Residences-Brochure" / "Westin-Residences-Gurugram-WhatsApp-CP Docket.pdf",
        "source": "westin",
        "file_type": "pdf",
    },
]

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "pricing": ["price", "crore", "cost", "rate", "sqft", "sq ft", "payment", "rera", "₹"],
    "amenities": ["clubhouse", "pool", "gym", "yoga", "spa", "tennis", "amenity", "recreation", "skyhub"],
    "location": ["sector", "expressway", "metro", "airport", "connectivity", "distance", "highway"],
    "specs": ["bhk", "carpet", "super area", "floor", "tower", "configuration", "bedroom", "balcony"],
    "investment": ["roi", "appreciation", "rental", "yield", "investment", "nri", "return", "cagr"],
    "security": ["security", "cctv", "biometric", "rfid", "camera", "surveillance", "panic"],
}


def _detect_category(text: str) -> str:
    text_lower = text.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return category
    return "general"


def _read_text_file(path: Path) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def _chunk(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def build_knowledge_base() -> list[dict]:
    """
    Load all source documents, chunk them, embed each chunk with Gemini,
    and return a list of dicts ready for in-memory retrieval.
    Call once at server startup.
    """
    all_chunks: list[dict] = []

    for source in SOURCES:
        path: Path = source["path"]
        if not path.exists():
            print(f"[ingest] WARNING: {path} not found, skipping.")
            continue

        print(f"[ingest] Loading {path.name} ({source['source']})...")

        if source["file_type"] == "text":
            raw_text = _read_text_file(path)
        else:
            raw_text = _read_pdf(path)

        chunks = _chunk(raw_text)
        print(f"[ingest]   {len(chunks)} chunks, embedding...")

        for chunk_text in chunks:
            embedding = embed(chunk_text)
            all_chunks.append(
                {
                    "text": chunk_text,
                    "embedding": np.array(embedding, dtype=np.float32),
                    "source": source["source"],
                    "category": _detect_category(chunk_text),
                }
            )

    print(f"[ingest] Knowledge base ready: {len(all_chunks)} chunks total.")
    return all_chunks
```

- [ ] **Step 2: Smoke-test ingestion (this calls Gemini — takes ~1-2 minutes)**

```bash
source venv/bin/activate
python3 -c "
from knowledge.ingest import build_knowledge_base
chunks = build_knowledge_base()
print(f'Total chunks: {len(chunks)}')
print(f'Sample chunk source: {chunks[0][\"source\"]}')
print(f'Sample embedding length: {len(chunks[0][\"embedding\"])}')
"
```
Expected: `Total chunks: 100-200`, embedding length 768.

- [ ] **Step 3: Commit**

```bash
git add knowledge/ingest.py
git commit -m "feat: knowledge base ingestion from PDFs and research.txt"
```

---

## Task 9: FastAPI App

**Files:**
- Create: `main.py`

- [ ] **Step 1: Create main.py**

```python
import json
import re
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

from core.redis_client import load_session, save_session, clear_session, get_redis
from core.decision_engine import classify, should_trigger_urgency
from core.gemini import chat
from knowledge.ingest import build_knowledge_base
from knowledge.retriever import load as load_kb, retrieve, chunk_count
from models.session import ChatMessage
from models.response import ChatResponse
from prompts.system_prompt import build as build_prompt

load_dotenv()

RESET_PHRASES = {"reset", "start over", "clear chat", "shuru karo", "restart"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Building knowledge base...")
    chunks = build_knowledge_base()
    load_kb(chunks)
    print(f"[startup] Ready. {chunk_count()} chunks loaded.")
    yield


app = FastAPI(title="Inframantra Chatbot API", version="1.0.0", lifespan=lifespan)


class ChatRequest(BaseModel):
    message: str
    session_id: str


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


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    message = request.message.strip()
    session_id = request.session_id

    # Load session from Redis
    session = load_session(session_id)

    # Reset check
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

    # Update user state via decision engine
    session.state = classify(message, session.state)

    # Urgency check
    urgency = should_trigger_urgency(session.state)
    if urgency:
        session.state.urgency_last_triggered = session.state.messages_count

    # RAG: retrieve relevant knowledge
    source_bias = session.state.project_bias if session.state.project_bias != "neutral" else None
    rag_chunks = retrieve(message, top_k=5, source_bias=source_bias)

    # Build dynamic system prompt
    prompt = build_prompt(
        user_message=message,
        state=session.state,
        rag_chunks=rag_chunks,
        history=session.history,
        urgency=urgency,
    )

    # Call Gemini
    raw_response = chat(prompt)

    # Parse structured JSON response
    response_data = _parse_response(raw_response)

    # Sync state fields from Gemini's response
    if response_data.get("project_bias") in ("westin", "tulip", "neutral"):
        session.state.project_bias = response_data["project_bias"]
    if response_data.get("lead_stage"):
        session.state.lead_stage = response_data["lead_stage"]
    if response_data.get("language") in ("en", "hi"):
        session.state.language = response_data["language"]

    # Append exchange to history
    session.history.append(ChatMessage(role="user", content=message))
    session.history.append(ChatMessage(role="assistant", content=response_data["answer"]))

    # Persist session
    save_session(session_id, session)

    return ChatResponse(**response_data)


def _parse_response(raw: str) -> dict:
    """Extract and parse the JSON object from Gemini's response."""
    cleaned = re.sub(r"```(?:json)?\n?", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse Gemini response as JSON. Raw: {raw[:300]}")
```

- [ ] **Step 2: Commit**

```bash
git add main.py
git commit -m "feat: FastAPI app with /chat and /health endpoints"
```

---

## Task 10: Integration Tests for /chat and /health

**Files:**
- Create: `tests/test_chat_endpoint.py`

- [ ] **Step 1: Create tests/test_chat_endpoint.py**

```python
import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient


MOCK_GEMINI_JSON = json.dumps({
    "answer": "Welcome! Are you exploring for investment or personal use?",
    "follow_up_question": "What is your primary goal with this property?",
    "project_bias": "neutral",
    "lead_stage": "exploring",
    "urgency_flag": False,
    "language": "en",
    "cta": "Tell me your goal",
    "handoff_needed": False,
})

MOCK_HINDI_JSON = json.dumps({
    "answer": "Hanji! Aap investment ke liye dekh rahe hain ya rehne ke liye?",
    "follow_up_question": "Aapka budget kya hai?",
    "project_bias": "neutral",
    "lead_stage": "exploring",
    "urgency_flag": False,
    "language": "hi",
    "cta": "Batao apna goal",
    "handoff_needed": False,
})


@pytest.fixture
def client():
    with patch("knowledge.ingest.build_knowledge_base", return_value=[]), \
         patch("knowledge.retriever.load"):
        from main import app
        with TestClient(app) as c:
            yield c


def test_health_returns_ok(client):
    with patch("core.redis_client.get_redis") as mock_r:
        mock_r.return_value.ping.return_value = True
        response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["redis"] == "connected"
    assert "knowledge_chunks" in body


def test_health_redis_disconnected(client):
    with patch("core.redis_client.get_redis") as mock_r:
        mock_r.return_value.ping.side_effect = Exception("connection refused")
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["redis"] == "disconnected"


def test_chat_returns_valid_response(client):
    from models.session import SessionData
    with patch("core.redis_client.load_session", return_value=SessionData()), \
         patch("core.redis_client.save_session"), \
         patch("knowledge.retriever.retrieve", return_value=[]), \
         patch("core.gemini.chat", return_value=MOCK_GEMINI_JSON):

        response = client.post("/chat", json={"message": "Hello", "session_id": "test-001"})

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "Welcome! Are you exploring for investment or personal use?"
    assert body["lead_stage"] == "exploring"
    assert body["urgency_flag"] is False
    assert body["language"] == "en"
    assert "follow_up_question" in body
    assert "cta" in body
    assert "handoff_needed" in body


def test_reset_clears_session_and_returns_fresh_greeting(client):
    from models.session import SessionData
    with patch("core.redis_client.load_session", return_value=SessionData()), \
         patch("core.redis_client.clear_session") as mock_clear:

        response = client.post("/chat", json={"message": "reset", "session_id": "test-002"})

    assert response.status_code == 200
    mock_clear.assert_called_once_with("test-002")
    assert "start fresh" in response.json()["answer"].lower()


def test_chat_hindi_response(client):
    from models.session import SessionData
    with patch("core.redis_client.load_session", return_value=SessionData()), \
         patch("core.redis_client.save_session"), \
         patch("knowledge.retriever.retrieve", return_value=[]), \
         patch("core.gemini.chat", return_value=MOCK_HINDI_JSON):

        response = client.post("/chat", json={
            "message": "Hanji batao mujhe kya chahiye hai",
            "session_id": "test-003"
        })

    assert response.status_code == 200
    assert response.json()["language"] == "hi"


def test_chat_investment_message_biases_toward_westin(client):
    from models.session import SessionData
    import json as _json
    westin_json = _json.dumps({
        "answer": "Great, for investment Westin Residences offers Marriott management.",
        "follow_up_question": "What BHK size are you considering?",
        "project_bias": "westin",
        "lead_stage": "exploring",
        "urgency_flag": False,
        "language": "en",
        "cta": "Explore Westin ROI",
        "handoff_needed": False,
    })
    with patch("core.redis_client.load_session", return_value=SessionData()), \
         patch("core.redis_client.save_session"), \
         patch("knowledge.retriever.retrieve", return_value=[]), \
         patch("core.gemini.chat", return_value=westin_json):

        response = client.post("/chat", json={
            "message": "I want to invest for ROI and appreciation",
            "session_id": "test-004"
        })

    assert response.status_code == 200
    assert response.json()["project_bias"] == "westin"
```

- [ ] **Step 2: Run all tests**

```bash
pytest tests/ -v
```
Expected: all tests PASS (decision_engine: 17, retriever: 9, system_prompt: 10, chat_endpoint: 6 = **42 tests total**).

- [ ] **Step 3: Commit**

```bash
git add tests/test_chat_endpoint.py
git commit -m "test: integration tests for /chat and /health endpoints"
```

---

## Task 11: End-to-End Smoke Test (Live Run)

- [ ] **Step 1: Start the server**

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
Expected log output:
```
[ingest] Loading research.txt (research)...
[ingest] Loading brochure small.pdf (tulip)...
[ingest] Loading The Westin Residences, Gurugram.pdf (westin)...
[ingest] Loading Westin-Residences-Gurugram-WhatsApp-CP Docket.pdf (westin)...
[ingest] Knowledge base ready: NNN chunks total.
[startup] Ready. NNN chunks loaded.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

- [ ] **Step 2: Hit /health**

```bash
curl http://localhost:8000/health | python3 -m json.tool
```
Expected:
```json
{
    "status": "ok",
    "redis": "connected",
    "knowledge_chunks": 120
}
```

- [ ] **Step 3: Send a greeting message**

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, I am looking for a luxury property in Gurugram", "session_id": "live-test-001"}' \
  | python3 -m json.tool
```
Expected: JSON response with `answer`, `follow_up_question`, `lead_stage: "exploring"`.

- [ ] **Step 4: Send an investment intent message**

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to invest for ROI and capital appreciation", "session_id": "live-test-001"}' \
  | python3 -m json.tool
```
Expected: `project_bias: "westin"`, answer references Westin/Marriott management.

- [ ] **Step 5: Test Hindi**

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hanji mujhe kya batao is property ke baare mein", "session_id": "live-test-002"}' \
  | python3 -m json.tool
```
Expected: `language: "hi"`, answer in Hindi.

- [ ] **Step 6: Test reset**

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "reset", "session_id": "live-test-001"}' \
  | python3 -m json.tool
```
Expected: `answer` contains "start fresh", `lead_stage: "new"`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verified end-to-end smoke test passing"
```

---

## Quick Reference: Running the Server

```bash
# First time setup
brew install redis && brew services start redis
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Start server (knowledge base loads automatically on startup)
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Run tests
pytest tests/ -v

# API endpoint
POST http://localhost:8000/chat
GET  http://localhost:8000/health
```
