import re

INTENT_KEYWORDS = (
    "price list",
    "pricing",
    "become a client",
    "become your client",
    "want to buy",
    "interested in your service",
    "need a proposal",
    "start cooperation",
    "sales demo",
    "book a call",
)


def detect_sales_intent(subject: str | None, body: str | None) -> dict[str, object]:
    haystack = f"{subject or ''}\n{body or ''}".lower()
    matched: list[str] = []
    for keyword in INTENT_KEYWORDS:
        pattern = r"\b" + re.escape(keyword.lower()) + r"\b"
        if re.search(pattern, haystack):
            matched.append(keyword)
    return {
        "is_priority": bool(matched),
        "pending_review": bool(matched),
        "matches": matched,
    }
