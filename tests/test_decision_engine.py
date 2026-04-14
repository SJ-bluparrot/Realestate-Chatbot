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
