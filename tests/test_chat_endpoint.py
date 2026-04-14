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
    with patch("main.get_redis") as mock_r:
        mock_r.return_value.ping.return_value = True
        response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["redis"] == "connected"
    assert "knowledge_chunks" in body


def test_health_redis_disconnected(client):
    with patch("main.get_redis") as mock_r:
        mock_r.return_value.ping.side_effect = Exception("connection refused")
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["redis"] == "disconnected"


def test_chat_returns_valid_response(client):
    from models.session import SessionData
    with patch("main.load_session", return_value=SessionData()), \
         patch("main.save_session"), \
         patch("main.retrieve", return_value=[]), \
         patch("main.chat", return_value=MOCK_GEMINI_JSON):

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
    with patch("main.load_session", return_value=SessionData()), \
         patch("main.clear_session") as mock_clear:

        response = client.post("/chat", json={"message": "reset", "session_id": "test-002"})

    assert response.status_code == 200
    mock_clear.assert_called_once_with("test-002")
    assert "start fresh" in response.json()["answer"].lower()


def test_chat_hindi_response(client):
    from models.session import SessionData
    with patch("main.load_session", return_value=SessionData()), \
         patch("main.save_session"), \
         patch("main.retrieve", return_value=[]), \
         patch("main.chat", return_value=MOCK_HINDI_JSON):

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
    with patch("main.load_session", return_value=SessionData()), \
         patch("main.save_session"), \
         patch("main.retrieve", return_value=[]), \
         patch("main.chat", return_value=westin_json):

        response = client.post("/chat", json={
            "message": "I want to invest for ROI and appreciation",
            "session_id": "test-004"
        })

    assert response.status_code == 200
    assert response.json()["project_bias"] == "westin"
