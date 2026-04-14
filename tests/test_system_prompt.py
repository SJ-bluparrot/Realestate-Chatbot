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


def test_prompt_ends_with_json_instruction():
    state = UserState()
    prompt = build("Hi", state, [], [], False)
    assert "JSON" in prompt
