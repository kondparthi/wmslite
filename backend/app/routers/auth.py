"""
Authentication endpoints: login and "who am I".

Login checks tenant_id + (username OR email) + password against the users
table — this is real credential validation against MySQL, not a client-side
form that accepts anything.
"""
from datetime import datetime

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token, verify_password
from app.models.admin_config import LoginHistory
from app.models.auth import User
from app.schemas.auth import LoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(
            User.tenant_id == payload.tenant_id,
            or_(User.username == payload.username, User.email == payload.username),
        )
        .first()
    )
    ip_address = request.client.host if request.client else None

    def _log(status_label: str) -> None:
        db.add(LoginHistory(
            user_id=user.id if user else None, username_attempted=payload.username,
            role=user.role if user else None, ip_address=ip_address, status=status_label,
            mfa_verified=bool(user and user.mfa_enabled),
        ))
        db.commit()

    if not user or not user.is_active:
        _log("Failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant ID, username/email, or password")
    if user.locked:
        _log("Locked")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This account is locked. Contact your administrator.")
    if not verify_password(payload.password, user.password_hash):
        # Same error for "no such user" and "wrong password" — don't leak which one.
        _log("Failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant ID, username/email, or password")

    user.last_login_at = datetime.utcnow()
    _log("Success")

    token = create_access_token(subject=str(user.id), extra_claims={"tenant_id": user.tenant_id})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency other routers can use (Depends(get_current_user)) once
    protected endpoints are needed beyond login itself."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        claims = decode_access_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.get(User, int(claims["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
