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
