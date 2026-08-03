from fastapi import APIRouter, Request, Response, HTTPException, status, Depends
from pydantic import BaseModel
from app.config import settings
from app.auth.security import (
    check_ip_rate_limit,
    record_failed_login,
    record_successful_login,
    verify_password,
    create_jwt_session_token,
    get_current_user_from_cookie
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    ok: bool
    message: str = "Authenticated successfully"

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # 1. Rate limit check
    check_ip_rate_limit(client_ip)

    # 2. Check password against APP_PASSWORD_HASH
    # If no hash is set in dev mode, check against default or settings password
    if not settings.APP_PASSWORD_HASH:
        # Development fallback: check if password matches 'admin' or environment fallback
        is_valid = (payload.password == "admin" or payload.password == "scrybe2026")
    else:
        is_valid = verify_password(payload.password, settings.APP_PASSWORD_HASH)

    if not is_valid:
        record_failed_login(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_password", "message": "Incorrect password"}
        )

    # 3. Success -> Clear attempts & issue token
    record_successful_login(client_ip)
    token = create_jwt_session_token()

    # 4. Set httpOnly cookie
    is_prod = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=settings.JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )

    return LoginResponse(ok=True)

@router.post("/logout")
def logout(response: Response, current_user: dict = Depends(get_current_user_from_cookie)):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/"
    )
    return {"ok": True, "message": "Logged out successfully"}

@router.get("/session")
def check_session(current_user: dict = Depends(get_current_user_from_cookie)):
    return {
        "authenticated": True,
        "subject": current_user.get("sub"),
        "expires_at": current_user.get("exp")
    }
