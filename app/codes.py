"""Unguessable case codes. ~62^10 combinations; only SHA-256 is stored."""
import hashlib
import secrets

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
CODE_LEN = 10
PREFIX = "WD-"


def generate_case_code() -> str:
    suffix = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LEN))
    return f"{PREFIX}{suffix}"


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()
