from app.pipeline.extractor import _coerce_extraction, build_user_prompt
from app.types import MailSender, RawMessage


def make_msg(**over):
    base = dict(
        id="m1",
        subject="hi",
        snippet="snip",
        body="some body content",
        receivedAt="2026-05-23T07:00:00-04:00",
    )
    base.update(over)
    return RawMessage(**{"from": MailSender(name="Priya", email="p@x.com")}, **base)


def test_build_user_prompt_truncates_long_body():
    msg = make_msg(body="x" * 5000)
    prompt = build_user_prompt(msg)
    assert len(prompt) < 3000


def test_coerce_returns_none_when_no_action():
    msg = make_msg()
    raw = {"has_action": False, "ask": None}
    assert _coerce_extraction(raw, msg) is None


def test_coerce_returns_extraction_when_action_present():
    msg = make_msg()
    raw = {
        "has_action": True,
        "ask": "Review the Q3 deck",
        "due": "2026-05-24",
        "who_asked": "Priya",
        "confidence": 0.9,
    }
    out = _coerce_extraction(raw, msg)
    assert out is not None
    assert out.ask == "Review the Q3 deck"
    assert out.due == "2026-05-24"
    assert out.confidence == 0.9


def test_coerce_clamps_confidence():
    msg = make_msg()
    raw = {"has_action": True, "ask": "Do it", "confidence": 2.0}
    out = _coerce_extraction(raw, msg)
    assert out is not None
    assert out.confidence == 1.0


def test_coerce_defaults_who_asked_to_sender_name():
    msg = make_msg()
    raw = {"has_action": True, "ask": "Reply", "confidence": 0.8}
    out = _coerce_extraction(raw, msg)
    assert out is not None
    assert out.who_asked == "Priya"
