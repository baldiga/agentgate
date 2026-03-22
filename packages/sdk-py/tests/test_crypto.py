import hmac as hmac_module
import hashlib
import json
import pytest
from agentgate.crypto import verify_payload_hmac

TOKEN = "sdk-token-for-testing-hmac"

BASE_CONTEXT: dict = {
    "message": "What is Q1 budget?",
    "user": {"id": "u_1", "name": "Sara M.", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read", "query"],
    "thread_id": "t_456",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {"files": [], "api_keys": [], "repos": []},
}


def _sort_keys(obj):
    """Mirror of the canonical key-sort used by the platform backend."""
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def sign_payload(payload: dict, token: str) -> str:
    canonical = json.dumps(_sort_keys(payload), separators=(",", ":"))
    return hmac_module.new(
        token.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def make_signed(**overrides):
    payload = {**BASE_CONTEXT, **overrides}
    hmac_val = sign_payload(payload, TOKEN)
    return {**payload, "hmac": hmac_val}


def test_returns_true_for_valid_hmac():
    payload = make_signed()
    assert verify_payload_hmac(payload, TOKEN) is True


def test_returns_false_when_hmac_is_tampered():
    payload = make_signed()
    payload["hmac"] = payload["hmac"] + "x"
    assert verify_payload_hmac(payload, TOKEN) is False


def test_returns_false_when_payload_content_modified_after_signing():
    payload = make_signed()
    payload["role"] = "SUPERADMIN"  # tamper after signing
    assert verify_payload_hmac(payload, TOKEN) is False


def test_returns_false_when_token_is_wrong():
    payload = make_signed()
    assert verify_payload_hmac(payload, "wrong-token") is False


def test_returns_false_when_hmac_field_missing():
    payload = dict(BASE_CONTEXT)  # no hmac field
    assert verify_payload_hmac(payload, TOKEN) is False


def test_invariant_to_key_ordering_in_received_payload():
    """HMAC must verify even if key order in the received dict differs."""
    payload = make_signed()
    # Reorder keys
    reordered = {
        "hmac": payload["hmac"],
        "sources": payload["sources"],
        "message": payload["message"],
        "is_superadmin": payload["is_superadmin"],
        "channel_id": payload["channel_id"],
        "thread_id": payload["thread_id"],
        "permissions": payload["permissions"],
        "role": payload["role"],
        "user": payload["user"],
    }
    assert verify_payload_hmac(reordered, TOKEN) is True


def test_null_channel_id_is_handled():
    """None (JSON null) must be serialised identically to TypeScript JSON.stringify(null)."""
    payload = make_signed(channel_id=None)
    assert verify_payload_hmac(payload, TOKEN) is True
