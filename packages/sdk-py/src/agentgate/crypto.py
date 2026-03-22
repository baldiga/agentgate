"""
HMAC-SHA256 payload verification.

The platform backend computes:
  canonical = JSON.stringify(sortKeys(userContext))   # compact, keys sorted
  hmac = HMAC-SHA256(canonical, sdk_token)

We verify by recomputing over the payload minus the 'hmac' key.

CRITICAL: json.dumps must use separators=(',', ':') (compact) to match
TypeScript's JSON.stringify output exactly.
"""

import hashlib
import hmac as _hmac
import json


def _sort_keys(obj):
    """Recursively sort dict keys. Arrays are NOT reordered (only dict keys)."""
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def verify_payload_hmac(payload: dict, token: str) -> bool:
    """
    Return True if payload['hmac'] matches the HMAC-SHA256 computed over
    the payload (excluding the 'hmac' key) with the given token.

    Returns False if the 'hmac' field is missing, invalid, or the token is wrong.
    """
    hmac_value = payload.get("hmac")
    if not hmac_value or not isinstance(hmac_value, str):
        return False

    rest = {k: v for k, v in payload.items() if k != "hmac"}
    canonical = json.dumps(_sort_keys(rest), separators=(",", ":"))

    expected = _hmac.new(
        token.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Timing-safe comparison prevents timing attacks
    return _hmac.compare_digest(expected, hmac_value)
