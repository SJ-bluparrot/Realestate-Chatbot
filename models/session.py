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
    visit_intent: bool = False
    visit_date: Optional[str] = None
    visit_time: Optional[str] = None
    visit_status: Optional[str] = None
    booking_card_shown: bool = False
    contact_card_submitted: bool = False


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class SessionData(BaseModel):
    history: list[ChatMessage] = []
    state: UserState = UserState()
