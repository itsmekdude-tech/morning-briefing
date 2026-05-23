import pytest
from app.pipeline.classifier import _coerce_classification, _fallback_classification, build_user_prompt
from app.types import RawMessage, MailSender


def make_msg(**over):
    base = dict(
        id="m1",
        subject="Hello",
        snippet="Hi there",
        receivedAt="2026-05-23T07:00:00-04:00",
    )
    base.update(over)
    return RawMessage(**{"from": MailSender(name="Test", email="t@example.com")}, **base)


def test_build_user_prompt_includes_required_fields():
    msg = make_msg(subject="Q3 deck", snippet="Need review")
    prompt = build_user_prompt(msg)
    assert "Q3 deck" in prompt
    assert "Need review" in prompt
    assert "t@example.com" in prompt


def test_coerce_clamps_urgency_and_validates_category():
    msg = make_msg()
    raw = {"category": "garbage", "is_noise": True, "intent": "fyi", "urgency": 99}
    result = _coerce_classification(raw, msg)
    assert result.category == "primary"  # fallback
    assert result.urgency == 3  # clamped


def test_coerce_handles_missing_keys():
    msg = make_msg()
    result = _coerce_classification({}, msg)
    assert result.category == "primary"
    assert result.intent == "fyi"
    assert result.is_noise is False


def test_fallback_uses_gmail_hint_when_available():
    msg = make_msg(gmailCategoryHint="promotions")
    result = _fallback_classification(msg)
    assert result.category == "promotions"


def test_coerce_recovers_from_loose_intent():
    msg = make_msg()
    raw = {"category": "primary", "is_noise": False, "intent": "weird-value", "urgency": 1}
    result = _coerce_classification(raw, msg)
    assert result.intent == "fyi"
