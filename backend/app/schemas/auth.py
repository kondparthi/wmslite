from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    tenant_id: str
    username: str  # accepts email or username
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: str
    username: str
    email: str
    full_name: str | None = None
    role: str
    status: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
