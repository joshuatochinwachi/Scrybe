import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
import bcrypt
import jwt
from fastapi import Request, HTTPException, status
from app.config import settings

# In-memory login attempt tracking: { ip: (attempt_count, lockout_until_timestamp) }
_LOGIN_ATTEMPTS: Dict[str, Tuple[int, float]] = {}

MAX_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 60

def check_ip_rate_limit(client_ip: str):
    """Check if an IP address is currently rate-limited."""
    now = time.time()
    if client_ip in _LOGIN_ATTEMPTS:
        attempts, lockout_until = _LOGIN_ATTEMPTS[client_ip]
        if lockout_until > now:
            remaining_seconds = int(lockout_until - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "too_many_failed_attempts",
                    "message": f"Too many failed login attempts. Try again in {remaining_seconds} seconds.",
                    "retry_after_seconds": remaining_seconds
                }
            )
        elif lockout_until <= now and attempts >= MAX_ATTEMPTS:
            # Reset after lockout period expires
            _LOGIN_ATTEMPTS.pop(client_ip, None)

def record_failed_login(client_ip: str):
    """Record a failed login attempt for an IP address."""
    now = time.time()
    attempts, lockout_until = _LOGIN_ATTEMPTS.get(client_ip, (0, 0.0))
    attempts += 1
    
    if attempts >= MAX_ATTEMPTS:
        lockout_until = now + LOCKOUT_DURATION_SECONDS
    
    _LOGIN_ATTEMPTS[client_ip] = (attempts, lockout_until)

def record_successful_login(client_ip: str):
    """Clear failed login attempts on success."""
    _LOGIN_ATTEMPTS.pop(client_ip, None)

import hmac

def verify_password(plain_password: str, stored_password: str) -> bool:
    """
    Constant-time password check.
    Supports both bcrypt hashes ($2b$...) and direct plaintext passwords seamlessly.
    """
    if not plain_password or not stored_password:
        return False

    # Check if stored_password is a bcrypt hash (starts with $2a$, $2b$, $2y$)
    if stored_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                stored_password.encode('utf-8')
            )
        except Exception:
            return False

    # Otherwise perform constant-time string comparison for plaintext passwords
    return hmac.compare_digest(plain_password, stored_password)

def hash_password(plain_password: str) -> str:
    """Helper to hash a raw password with bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode('utf-8'), salt).decode('utf-8')

def create_jwt_session_token(subject: str = "scrybe_admin") -> str:
    """Create a signed JWT session token."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "iss": "scrybe_backend"
    }
    return jwt.encode(payload, settings.JWT_SECRET or "dev_secret_key_change_in_prod", algorithm=settings.JWT_ALGORITHM)

def verify_jwt_session_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT session token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET or "dev_secret_key_change_in_prod",
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except (jwt.PyJWTError, Exception):
        return None

def get_current_user_from_cookie(request: Request) -> dict:
    """Extract and verify session JWT from httpOnly cookie."""
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        # Also check Authorization header for flexibility
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Authentication required"}
        )
    
    payload = verify_jwt_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_or_expired_token", "message": "Session expired or invalid"}
        )
    
    return payload
