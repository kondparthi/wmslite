"""
Authentication endpoints: login and "who am I".

Login checks tenant_id + (username OR email) + password against the users
table — this is real credential validation against MySQL, not a client-side
form that accepts anything.
"""
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core import config
from app.core.database import get_db
from app.core.mailer import send_email
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.admin_config import LoginHistory
from app.models.auth import PasswordResetCode, User
from app.schemas.auth import (
    ForgotPasswordRequest, LoginRequest, MessageResponse, ResetPasswordRequest,
    TokenResponse, UserRead, VerifyResetCodeRequest,
)

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

    # "Remember me" = a long-lived token (30 days by default); otherwise the
    # normal short session (ACCESS_TOKEN_EXPIRE_MINUTES).
    expires = config.REMEMBER_ME_EXPIRE_DAYS * 24 * 60 if payload.remember_me else None
    token = create_access_token(subject=str(user.id), extra_claims={"tenant_id": user.tenant_id}, expires_minutes=expires)
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



# ---------------------------------------------------------------------------
# Forgot password: request code -> verify code -> set new password
# ---------------------------------------------------------------------------
GENERIC_SENT = "If an account matches those details, a 6-digit verification code has been sent to its registered email."
BAD_CODE = "The verification code is invalid or has expired. Request a new code and try again."


def _hash_code(code: str) -> str:
    return hmac.new(config.JWT_SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def _find_user(db: Session, tenant_id: str, username: str) -> User | None:
    return (
        db.query(User)
        .filter(
            User.tenant_id == tenant_id.strip(),
            or_(User.username == username.strip(), User.email == username.strip()),
            User.is_active == True,  # noqa: E712
        )
        .first()
    )


def _active_code(db: Session, user: User) -> PasswordResetCode | None:
    return (
        db.query(PasswordResetCode)
        .filter(PasswordResetCode.user_id == user.id, PasswordResetCode.used == False)  # noqa: E712
        .order_by(PasswordResetCode.id.desc())
        .first()
    )


def _check_code(db: Session, user: User | None, code: str) -> PasswordResetCode:
    """Validates a submitted code; raises 400 with one generic message for every failure."""
    bad = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=BAD_CODE)
    if user is None:
        raise bad
    rec = _active_code(db, user)
    if rec is None or rec.expires_at < datetime.utcnow() or rec.attempts >= config.RESET_CODE_MAX_ATTEMPTS:
        raise bad
    if not hmac.compare_digest(rec.code_hash, _hash_code(code.strip())):
        rec.attempts += 1
        db.commit()
        raise bad
    return rec


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = _find_user(db, payload.tenant_id, payload.username)
    # Same response whether or not the account exists, so this can't be used
    # to discover valid usernames.
    if user and user.email:
        # invalidate earlier codes, then issue a new one
        db.query(PasswordResetCode).filter(
            PasswordResetCode.user_id == user.id, PasswordResetCode.used == False  # noqa: E712
        ).update({"used": True})
        code = f"{secrets.randbelow(1_000_000):06d}"
        db.add(PasswordResetCode(
            user_id=user.id, code_hash=_hash_code(code),
            expires_at=datetime.utcnow() + timedelta(minutes=config.RESET_CODE_EXPIRE_MINUTES),
        ))
        db.commit()
        background.add_task(
            send_email, user.email, "WMS Lite password reset code",
            f"Hello {user.full_name or user.username},\n\n"
            f"Your WMS Lite verification code is: {code}\n"
            f"It expires in {config.RESET_CODE_EXPIRE_MINUTES} minutes. If you did not request this, ignore this email.\n",
        )
    return MessageResponse(message=GENERIC_SENT)


@router.post("/verify-reset-code", response_model=MessageResponse)
def verify_reset_code(payload: VerifyResetCodeRequest, db: Session = Depends(get_db)):
    _check_code(db, _find_user(db, payload.tenant_id, payload.username), payload.code)
    return MessageResponse(message="Code verified.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    pw = payload.new_password
    if len(pw) < 8 or not re.search(r"[A-Z]", pw) or not re.search(r"\d", pw) or not re.search(r"[^A-Za-z0-9]", pw):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters with one uppercase letter, one number and one special character.",
        )
    user = _find_user(db, payload.tenant_id, payload.username)
    rec = _check_code(db, user, payload.code)
    user.password_hash = hash_password(pw)
    rec.used = True
    db.commit()
    return MessageResponse(message="Password updated. You can now sign in.")
