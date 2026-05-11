"""
OTP Utility – Generates, stores, and verifies 6-digit email OTPs

OTPs are stored in-memory with a 10-minute expiry.
In production you'd use Redis, but for this project an in-memory
dict is perfectly fine.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Dict, Tuple

# In-memory OTP store: { email: (otp_code, expiry_datetime) }
_otp_store: Dict[str, Tuple[str, datetime]] = {}

OTP_EXPIRY_MINUTES = 10


def generate_otp(email: str) -> str:
    """Generate a 6-digit OTP for the given email and store it."""
    otp = "".join(random.choices(string.digits, k=6))
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    _otp_store[email] = (otp, expiry)
    return otp


def verify_otp(email: str, otp: str) -> bool:
    """
    Verify the OTP for the given email.
    Returns True if valid and not expired, False otherwise.
    Deletes the OTP after successful verification.
    """
    if email not in _otp_store:
        return False

    stored_otp, expiry = _otp_store[email]

    if datetime.utcnow() > expiry:
        del _otp_store[email]
        return False

    if stored_otp != otp:
        return False

    # Valid — remove it so it can't be reused
    del _otp_store[email]
    return True


def has_pending_otp(email: str) -> bool:
    """Check if there's a valid (non-expired) OTP for this email."""
    if email not in _otp_store:
        return False
    _, expiry = _otp_store[email]
    return datetime.utcnow() <= expiry
