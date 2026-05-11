"""
Pydantic Schemas – request validation and response serialization
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────────────
class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


# ── User Schemas ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ── Auth Schemas ───────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ── Transaction Schemas ────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Amount must be positive")
    type: TransactionType
    category: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    date: datetime


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None


class TransactionOut(BaseModel):
    id: int
    amount: float
    type: TransactionType
    category: str
    description: Optional[str]
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ── Budget Schemas ─────────────────────────────────────────────────────────
class BudgetCreate(BaseModel):
    category: str = Field(default="Overall", max_length=50)
    limit_amount: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)


class BudgetOut(BaseModel):
    id: int
    category: str
    limit_amount: float
    month: int
    year: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics Schemas ──────────────────────────────────────────────────────
class MonthlySummary(BaseModel):
    month: int
    year: int
    total_income: float
    total_expenses: float
    net_savings: float
    category_breakdown: dict


class ForecastOut(BaseModel):
    predicted_amount: float
    model: str
    confidence_note: str
    historical_months: List[dict]


class AnomalyOut(BaseModel):
    transaction_id: int
    amount: float
    category: str
    description: Optional[str]
    date: datetime
    mean_amount: float
    std_dev: float
    z_score: float


# ── Alert Schemas ──────────────────────────────────────────────────────────
class AlertLogOut(BaseModel):
    id: int
    alert_type: str
    message: str
    sent_at: datetime
    is_sent: bool

    class Config:
        from_attributes = True
