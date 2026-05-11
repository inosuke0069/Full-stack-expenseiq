"""
Budgets Router – /api/budgets
Set and manage monthly budget limits per category
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List, Optional

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter()


@router.post("/", response_model=schemas.BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_data: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Set a monthly budget limit.
    Category defaults to 'Overall'. Can also be a specific category like 'Food'.
    """
    # Check if a budget already exists for this category/month/year
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category == budget_data.category,
        models.Budget.month == budget_data.month,
        models.Budget.year == budget_data.year
    ).first()

    if existing:
        # Update existing budget instead of creating a duplicate
        existing.limit_amount = budget_data.limit_amount
        db.commit()
        db.refresh(existing)
        return existing

    new_budget = models.Budget(
        user_id=current_user.id,
        category=budget_data.category,
        limit_amount=budget_data.limit_amount,
        month=budget_data.month,
        year=budget_data.year
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget


@router.get("/", response_model=List[schemas.BudgetOut])
def get_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Retrieve all budgets for the current user, optionally filtered by month/year."""
    query = db.query(models.Budget).filter(models.Budget.user_id == current_user.id)
    if month:
        query = query.filter(models.Budget.month == month)
    if year:
        query = query.filter(models.Budget.year == year)
    return query.all()


@router.get("/status")
def get_budget_status(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Get budget vs actual spending status for a given month.
    Returns remaining budget and % used for each category.
    """
    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.month == month,
        models.Budget.year == year
    ).all()

    result = []
    for b in budgets:
        if b.category == "Overall":
            spent = sum(
                t.amount for t in db.query(models.Transaction).filter(
                    models.Transaction.user_id == current_user.id,
                    models.Transaction.type == "expense",
                    extract("month", models.Transaction.date) == month,
                    extract("year", models.Transaction.date) == year
                ).all()
            )
        else:
            spent = sum(
                t.amount for t in db.query(models.Transaction).filter(
                    models.Transaction.user_id == current_user.id,
                    models.Transaction.type == "expense",
                    models.Transaction.category == b.category,
                    extract("month", models.Transaction.date) == month,
                    extract("year", models.Transaction.date) == year
                ).all()
            )

        result.append({
            "category": b.category,
            "limit": b.limit_amount,
            "spent": round(spent, 2),
            "remaining": round(max(0, b.limit_amount - spent), 2),
            "percentage_used": round((spent / b.limit_amount) * 100, 1) if b.limit_amount > 0 else 0,
            "status": "exceeded" if spent >= b.limit_amount else
                      "warning" if spent >= b.limit_amount * 0.8 else "ok"
        })

    return {"month": month, "year": year, "budgets": result}


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Delete a budget limit."""
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
