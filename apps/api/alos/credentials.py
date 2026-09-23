"""Bounded verification for retained v10 scrypt and current Argon2 credentials."""
import hashlib
import hmac
import re
import threading

from pwdlib import PasswordHash

passwords = PasswordHash.recommended()
_legacy_slots = threading.BoundedSemaphore(2)
_LEGACY = re.compile(r"scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})")


def supported(encoded):
    return isinstance(encoded, str) and (
        _LEGACY.fullmatch(encoded) is not None or encoded.startswith("$argon2id$")
    )


def verify_password(password, encoded):
    if not isinstance(password, str) or not 1 <= len(password) <= 128:
        return False
    if not isinstance(encoded, str):
        return False
    legacy = _LEGACY.fullmatch(encoded)
    if legacy:
        with _legacy_slots:
            digest = hashlib.scrypt(
                password.encode(), salt=bytes.fromhex(legacy[1]),
                n=131072, r=8, p=1, maxmem=256 * 1024 * 1024,
            ).hex()
        return hmac.compare_digest(digest, legacy[2])
    if not encoded.startswith("$argon2id$"):
        return False
    try:
        return passwords.verify(password, encoded)
    except (ValueError, TypeError):
        return False
