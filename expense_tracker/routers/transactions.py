"""
Transactions Router – /api/transactions
Full CRUD for income and expense transactions
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List, Optional
from datetime import datetime

from database import get_db
import models
import schemas
import auth as auth_utils
from utils.email_service import send_budget_alert_email
from ml.anomaly_detector import check_anomaly

router = APIRouter()


@router.post("/", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    txn: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Create a new transaction (income or expense).
    After creation:
      - Checks if budget is exceeded and triggers email alert
      - Runs anomaly detection on the new expense
    """
    new_txn = models.Transaction(
        user_id=current_user.id,
        amount=txn.amount,
        type=txn.type,
        category=txn.category,
        description=txn.description,
        date=txn.date
    )
    db.add(new_txn)
    db.commit()
    db.refresh(new_txn)

    # ── Budget alert check ─────────────────────────────────────────────
    if txn.type == schemas.TransactionType.expense:
        _check_and_alert_budget(db, current_user, txn.date, txn.category)
        _check_and_alert_anomaly(db, current_user, new_txn)

    return new_txn


@router.get("/", response_model=List[schemas.TransactionOut])
def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    type: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Retrieve all transactions for the current user.
    Supports filtering by type, category, month, and year.
    """
    query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    )
    if type:
        query = query.filter(models.Transaction.type == type)
    if category:
        query = query.filter(models.Transaction.category == category)
    if month:
        query = query.filter(extract("month", models.Transaction.date) == month)
    if year:
        query = query.filter(extract("year", models.Transaction.date) == year)

    return query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()


@router.get("/{txn_id}", response_model=schemas.TransactionOut)
def get_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Retrieve a single transaction by ID."""
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == txn_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@router.put("/{txn_id}", response_model=schemas.TransactionOut)
def update_transaction(
    txn_id: int,
    updates: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Update an existing transaction."""
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == txn_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # BUG 4 FIX: .dict() is Pydantic v1 API → use .model_dump() for Pydantic v2
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(txn, field, value)

    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Delete a transaction."""
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == txn_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(txn)
    db.commit()


# ── Private helpers ────────────────────────────────────────────────────────

def _check_and_alert_budget(db: Session, user: models.User, date: datetime, category: str):
    """Check if any budget limit is breached and fire email alert."""
    month, year = date.month, date.year

    # Check overall budget
    budgets_to_check = db.query(models.Budget).filter(
        models.Budget.user_id == user.id,
        models.Budget.month == month,
        models.Budget.year == year,
        models.Budget.category.in_(["Overall", category])
    ).all()

    for budget in budgets_to_check:
        if budget.category == "Overall":
            total_spent = db.query(models.Transaction).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.type == "expense",
                extract("month", models.Transaction.date) == month,
                extract("year", models.Transaction.date) == year
            ).with_entities(
                models.Transaction.amount
            ).all()
        else:
            total_spent = db.query(models.Transaction).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.type == "expense",
                models.Transaction.category == budget.category,
                extract("month", models.Transaction.date) == month,
                extract("year", models.Transaction.date) == year
            ).with_entities(models.Transaction.amount).all()

        spent = sum(r[0] for r in total_spent)

        if spent >= budget.limit_amount * 0.8:
            alert_type = "budget_exceeded" if spent >= budget.limit_amount else "budget_warning"
            pct = round((spent / budget.limit_amount) * 100, 1)
            message = (
                f"{'⚠️ Budget Exceeded' if pct >= 100 else '⚠️ Budget Warning'}: "
                f"{budget.category} – ₹{spent:,.0f} / ₹{budget.limit_amount:,.0f} ({pct}% used)"
            )
            # Log the alert
            alert_log = models.AlertLog(
                user_id=user.id,
                alert_type=alert_type,
                message=message,
                is_sent=False
            )
            db.add(alert_log)
            db.commit()
            db.refresh(alert_log)

            # Send email asynchronously
            try:
                send_budget_alert_email(
                    to_email=user.email,
                    user_name=user.name,
                    category=budget.category,
                    spent=spent,
                    limit=budget.limit_amount,
                    percentage=pct
                )
                alert_log.is_sent = True
                db.commit()
            except Exception:
                pass  # Email failure should not break the transaction save


def _check_and_alert_anomaly(db: Session, user: models.User, new_txn: models.Transaction):
    """Run anomaly detection on the new transaction."""
    # Fetch recent transactions for the same category
    past = db.query(models.Transaction).filter(
        models.Transaction.user_id == user.id,
        models.Transaction.category == new_txn.category,
        models.Transaction.type == "expense",
        models.Transaction.id != new_txn.id
    ).all()

    if len(past) < 5:
        return  # Not enough data

    amounts = [t.amount for t in past]
    is_anomaly, z_score = check_anomaly(new_txn.amount, amounts)

    if is_anomaly:
        message = (
            f"🚨 Anomaly Detected: A {new_txn.category} expense of "
            f"₹{new_txn.amount:,.0f} is unusually high "
            f"(z-score={z_score:.2f})"
        )
        alert_log = models.AlertLog(
            user_id=user.id,
            alert_type="anomaly",
            message=message,
            is_sent=True
        )
        db.add(alert_log)
        db.commit()
