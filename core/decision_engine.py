import re
from models.session import UserState

INVESTMENT_SIGNALS = {"invest", "roi", "appreciation", "rental", "nri", "returns", "yield", "portfolio"}
END_USE_SIGNALS = {"family", "kids", "school", "live in", "end use", "ghar", "rehna", "children"}

# Direct project keyword signals — override bias immediately
TULIP_SIGNALS = {"tulip", "monsella", "tulip monsella", "golf course", "sector 53"}
WESTIN_SIGNALS = {"westin", "whiteland", "westin residences", "dwarka expressway", "sector 103"}
HINDI_TOKENS = {
    "hai", "hain", "kya", "mujhe", "aap", "nahi", "batao", "chahiye",
    "kaisa", "kab", "kahan", "kyun", "theek", "accha", "bahut", "hanji",
    "bhai", "yaar", "bilkul", "zaroor", "samjha", "dekhte"
}

# Patterns to extract name from user messages.
# High-confidence: explicit "my name is X" phrasing — always overrides stored name.
_EXPLICIT_NAME_PATTERN = re.compile(
    r"(?:my name is|mera naam|naam hai|mera naam hai)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    re.IGNORECASE,
)
# Lower-confidence: standalone "I am X" only when the name fills the whole message.
_IMPLICIT_NAME_PATTERN = re.compile(
    r"^(?:i am|i'm|main hoon)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\.?$",
    re.IGNORECASE,
)
# Standalone name only (e.g. "Chirag Thakur")
_STANDALONE_NAME_PATTERN = re.compile(
    r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+here|\s+speaking)?\.?$",
)

_COMMON_WORDS = {
    "exploring", "interested", "looking", "thinking", "planning", "considering",
    "wondering", "here", "speaking", "available", "ready", "okay", "calling",
    "contacting", "reaching", "writing", "texting",
}


def classify(message: str, state: UserState) -> UserState:
    msg_lower = message.lower()
    words = set(msg_lower.split())

    if len(words & HINDI_TOKENS) >= 2:
        state.language = "hi"

    if any(signal in msg_lower for signal in INVESTMENT_SIGNALS):
        state.intent = "investment"
        if state.project_bias == "neutral":
            state.project_bias = "westin"

    if any(signal in msg_lower for signal in END_USE_SIGNALS):
        state.intent = "end-use"
        if state.project_bias == "neutral":
            state.project_bias = "tulip"

    # Direct project name mention always sets bias (strongest signal)
    if any(signal in msg_lower for signal in TULIP_SIGNALS):
        state.project_bias = "tulip"
    elif any(signal in msg_lower for signal in WESTIN_SIGNALS):
        state.project_bias = "westin"

    for bhk in [3, 4, 5]:
        if f"{bhk} bhk" in msg_lower or f"{bhk}bhk" in msg_lower:
            state.bhk_preference = bhk
            break

    budget_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:cr|crore)', msg_lower)
    if budget_match:
        state.budget_cr = float(budget_match.group(1))

    phone_match = re.search(r'\b[6-9]\d{9}\b', message)
    if phone_match and not state.phone:
        state.phone = phone_match.group()

    # Extract name — explicit "my name is X" always wins (even if name already set)
    explicit_match = _EXPLICIT_NAME_PATTERN.search(message)
    if explicit_match:
        candidate = explicit_match.group(1).strip()
        if candidate.split()[0].lower() not in _COMMON_WORDS:
            state.name = candidate
    elif not state.name:
        # Only try implicit / standalone patterns when name not yet known
        for pattern in (_IMPLICIT_NAME_PATTERN, _STANDALONE_NAME_PATTERN):
            m = pattern.search(message.strip())
            if m:
                candidate = m.group(1).strip()
                if candidate.split()[0].lower() not in _COMMON_WORDS:
                    state.name = candidate
                    break

    state.messages_count += 1
    state = _advance_lead_stage(state)
    state.urgency_eligible = _is_urgency_eligible(state)

    return state


def _advance_lead_stage(state: UserState) -> UserState:
    if state.lead_stage == "new" and state.messages_count >= 1:
        state.lead_stage = "exploring"

    # Qualify if we know BHK OR project — intent is a bonus, not a requirement
    if state.lead_stage == "exploring" and (
        state.bhk_preference is not None or state.project_bias != "neutral"
    ):
        state.lead_stage = "qualified"

    # Warm: after 4 messages (card fires) — from qualified OR from exploring if user never gave BHK/project
    if state.lead_stage in ("qualified", "exploring") and state.messages_count >= 4:
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
    eligible = _is_urgency_eligible(state) or state.urgency_eligible
    if not eligible:
        return False
    if state.urgency_last_triggered is None:
        return True
    return (state.messages_count - state.urgency_last_triggered) > 3
