"""
Shared validators for ColdSync Pro — used by serializers and models.
"""
import re
from rest_framework.exceptions import ValidationError

# ── Regex patterns ────────────────────────────────────────────────────────────
PHONE_RE     = re.compile(r'^[6-9]\d{9}$')
USERNAME_RE  = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
NAME_RE      = re.compile(r"^[a-zA-Z\u0900-\u097F\s'\-\.]{2,100}$")  # Latin + Devanagari
EMAIL_RE     = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')
SAFE_TEXT_RE = re.compile(r'^[^<>{}\[\]\\;`$|&]*$')  # block XSS / injection chars


def validate_phone(value):
    clean = re.sub(r'[\s\+]', '', value)
    clean = re.sub(r'^91', '', clean)  # strip country code
    if not PHONE_RE.match(clean):
        raise ValidationError(
            'Enter a valid 10-digit Indian mobile number starting with 6-9.'
        )
    return clean


def validate_username(value):
    if not USERNAME_RE.match(value):
        raise ValidationError(
            'Username must be 3–30 characters: letters, numbers, underscores only. No spaces or special characters.'
        )
    if value.isdigit():
        raise ValidationError('Username cannot be only numbers. Add at least one letter.')
    if re.search(r'(--|;|\'|\"|\bOR\b|\bAND\b|\bSELECT\b|\bDROP\b)', value, re.I):
        raise ValidationError('Username contains invalid characters.')
    return value.strip()


def validate_name(value):
    if not NAME_RE.match(value.strip()):
        raise ValidationError(
            'Name must be 2–100 characters. Only letters, spaces, hyphens and dots allowed.'
        )
    if not SAFE_TEXT_RE.match(value):
        raise ValidationError('Name contains invalid characters.')
    return value.strip()


def validate_email_format(value):
    if not EMAIL_RE.match(value):
        raise ValidationError('Enter a valid email address (e.g. name@example.com).')
    if not SAFE_TEXT_RE.match(value):
        raise ValidationError('Email contains invalid characters.')
    return value.lower().strip()


def validate_password_strength(value):
    if len(value) < 6:
        raise ValidationError('Password must be at least 6 characters.')
    if len(value) > 128:
        raise ValidationError('Password is too long (max 128 characters).')
    if value.isdigit():
        raise ValidationError('Password cannot be all numbers. Add at least one letter.')
    if value.lower() in ('password', '123456', 'qwerty', 'abcdef', '111111', 'password1'):
        raise ValidationError('Password is too common. Choose a stronger password.')
    return value


def validate_safe_text(value, field_name='Field'):
    """Block XSS / SQL injection in free-text fields."""
    if not SAFE_TEXT_RE.match(value):
        raise ValidationError(
            f'{field_name} contains invalid characters (< > {{ }} [ ] \\ ; ` $ | &).'
        )
    if value.strip().isdigit():
        raise ValidationError(f'{field_name} cannot be only numbers.')
    return value
