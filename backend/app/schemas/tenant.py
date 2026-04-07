from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    role: str
    company_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyRead(BaseModel):
    id: uuid.UUID
    name: str
    cnpj: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
