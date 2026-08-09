"""Mints JWTs that the API will reject for a specific, known reason.

Only used for negative paths (an expired token). Every positive path signs in
through ``POST /api/auth/login``, so the real authentication code stays under
test. Needs the API's ``Jwt:Secret``; scenarios that use it are tagged
``@jwt_secret`` and are skipped when no secret is configured.
"""

from datetime import timedelta

import jwt

from features.utils.util import utc_now

ISSUER = "LocalHire"
AUDIENCE = "LocalHire.Users"


def mint_token(secret, user_id, email, role, name="Test User", lifetime_minutes=60):
    issued_at = utc_now()
    payload = {
        "sub": str(user_id),
        "email": email,
        "unique_name": name,
        "role": role,
        "jti": "00000000-0000-4000-8000-000000000001",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": issued_at,
        "nbf": issued_at,
        "exp": issued_at + timedelta(minutes=lifetime_minutes),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def mint_expired_token(secret, user_id, email, role, name="Test User"):
    return mint_token(secret, user_id, email, role, name, lifetime_minutes=-5)
