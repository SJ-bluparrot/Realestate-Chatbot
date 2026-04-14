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
    ask_contact: bool = False
