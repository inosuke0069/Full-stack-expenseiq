"""
SQLAlchemy ORM Models – maps Python classes to PostgreSQL tables
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class User(Base):
    """Registered user account"""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    transactions  = relationship("Transaction", back_populates="owner", cascade="all, delete")
    budgets       = relationship("Budget", back_populates="owner", cascade="all, delete")
    alerts        = relationship("AlertLog", back_populates="user", cascade="all, delete")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


class Transaction(Base):
    """Individual income or expense record"""
    __tablename__ = "transactions"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount      = Column(Float, nullable=False)
    type        = Column(Enum(TransactionType), nullable=False)
    category    = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)
    date        = Column(DateTime(timezone=True), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner       = relationship("User", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction id={self.id} amount={self.amount} type={self.type}>"


class Budget(Base):
    """Monthly budget limit per category or overall"""
    __tablename__ = "budgets"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    category    = Column(String(50), default="Overall")  # "Overall" or specific category
    limit_amount = Column(Float, nullable=False)
    month       = Column(Integer, nullable=False)   # 1-12
    year        = Column(Integer, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner       = relationship("User", back_populates="budgets")

    def __repr__(self):
        return f"<Budget id={self.id} category={self.category} limit={self.limit_amount}>"


class AlertLog(Base):
    """Record of email alerts sent to users"""
    __tablename__ = "alert_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type  = Column(String(50), nullable=False)   # e.g. "budget_exceeded", "anomaly"
    message     = Column(Text, nullable=False)
    sent_at     = Column(DateTime(timezone=True), server_default=func.now())
    is_sent     = Column(Boolean, default=False)

    # Relationships
    user        = relationship("User", back_populates="alerts")

    def __repr__(self):
        return f"<AlertLog id={self.id} type={self.alert_type}>"
