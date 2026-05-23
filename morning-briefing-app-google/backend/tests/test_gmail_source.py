from app.sources.gmail import _decode_body, _extract_plain_text, _gmail_label_to_category, _parse_from, _parse_received_at


def test_parse_from_with_display_name():
    s = _parse_from('Priya Shah <priya@bigco.com>')
    assert s.name == "Priya Shah"
    assert s.email == "priya@bigco.com"


def test_parse_from_with_quoted_name():
    s = _parse_from('"Priya, CFO" <priya@bigco.com>')
    assert s.name == "Priya, CFO"
    assert s.email == "priya@bigco.com"


def test_parse_from_just_email():
    s = _parse_from("noreply@stripe.com")
    assert s.email == "noreply@stripe.com"
    assert s.name == "noreply@stripe.com"


def test_label_to_category_mapping():
    assert _gmail_label_to_category(["CATEGORY_PERSONAL", "INBOX"]) == "primary"
    assert _gmail_label_to_category(["CATEGORY_PROMOTIONS"]) == "promotions"
    assert _gmail_label_to_category(["CATEGORY_FORUMS"]) == "forums"
    assert _gmail_label_to_category(["CATEGORY_UPDATES"]) == "updates"
    assert _gmail_label_to_category(["INBOX"]) is None


def test_extract_plain_text_walks_mime_tree():
    import base64
    body_text = "Hello there"
    encoded = base64.urlsafe_b64encode(body_text.encode()).decode().rstrip("=")
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {"mimeType": "text/html", "body": {"data": "ZmFrZQ=="}},
            {"mimeType": "text/plain", "body": {"data": encoded}},
        ],
    }
    assert _extract_plain_text(payload) == body_text


def test_decode_body_handles_empty():
    assert _decode_body({}) == ""
    assert _decode_body({"body": {}}) == ""


def test_parse_received_at_prefers_date_header():
    ts = _parse_received_at("Fri, 23 May 2026 06:14:00 -0400", None)
    assert "2026-05-23" in ts


def test_parse_received_at_falls_back_to_internal_date():
    # 2026-05-23 in ms
    internal = "1779696840000"
    ts = _parse_received_at("", internal)
    assert "2026" in ts
