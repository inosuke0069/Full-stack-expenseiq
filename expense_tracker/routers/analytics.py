"""
Analytics Router – /api/analytics
Provides dashboard summaries, ML-based forecasting, and anomaly detection
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import List
from datetime import datetime

from database import get_db
import models
import schemas
import auth as auth_utils
from ml.forecaster import forecast_next_month
from ml.anomaly_detector import detect_all_anomalies

router = APIRouter()


@router.get("/summary", response_model=schemas.MonthlySummary)
def get_monthly_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Monthly summary: total income, total expenses, savings, and category breakdown.
    """
    from sqlalchemy import func as sqlfunc

    base = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year
    )

    total_income = db.query(sqlfunc.coalesce(sqlfunc.sum(models.Transaction.amount), 0)).filter(
        models.Transaction.user_id == current_user.id,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year,
        models.Transaction.type == models.TransactionType.income
    ).scalar()

    total_expenses = db.query(sqlfunc.coalesce(sqlfunc.sum(models.Transaction.amount), 0)).filter(
        models.Transaction.user_id == current_user.id,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year,
        models.Transaction.type == models.TransactionType.expense
    ).scalar()

    # Category breakdown for expenses
    txns = base.all()
    cat_breakdown = {}
    for t in txns:
        if str(t.type).endswith("expense"):
            cat_breakdown[t.category] = cat_breakdown.get(t.category, 0) + t.amount

    return schemas.MonthlySummary(
        month=month,
        year=year,
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net_savings=round(total_income - total_expenses, 2),
        category_breakdown={k: round(v, 2) for k, v in cat_breakdown.items()}
    )


@router.get("/overall-summary")
def get_overall_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    All-time summary: total income, total expenses, net savings across all transactions.
    Used by the dashboard summary cards.
    """
    from sqlalchemy import func as sqlfunc

    total_income = db.query(sqlfunc.coalesce(sqlfunc.sum(models.Transaction.amount), 0)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == models.TransactionType.income
    ).scalar()

    total_expenses = db.query(sqlfunc.coalesce(sqlfunc.sum(models.Transaction.amount), 0)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == models.TransactionType.expense
    ).scalar()

    count = db.query(sqlfunc.count(models.Transaction.id)).filter(
        models.Transaction.user_id == current_user.id
    ).scalar()

    return {
        "total_income":   round(float(total_income), 2),
        "total_expenses": round(float(total_expenses), 2),
        "net_savings":    round(float(total_income) - float(total_expenses), 2),
        "transaction_count": count,
    }


@router.get("/forecast", response_model=schemas.ForecastOut)
def get_forecast(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Predict next month's total expenses using Linear Regression (scikit-learn).
    Trained on the user's historical monthly spending data.
    """
    # Aggregate monthly expenses across all history
    rows = (
        db.query(
            extract("year",  models.Transaction.date).label("year"),
            extract("month", models.Transaction.date).label("month"),
            func.sum(models.Transaction.amount).label("total")
        )
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense"
        )
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    if len(rows) < 2:
        return schemas.ForecastOut(
            predicted_amount=0.0,
            model="Linear Regression",
            confidence_note="Not enough data. Add at least 2 months of transactions.",
            historical_months=[]
        )

    historical = [
        {"year": int(r.year), "month": int(r.month), "total": round(r.total, 2)}
        for r in rows
    ]

    predicted = forecast_next_month([r["total"] for r in historical])

    return schemas.ForecastOut(
        predicted_amount=round(predicted, 2),
        model="Linear Regression (scikit-learn)",
        confidence_note=(
            "Forecast based on historical trend. More data improves accuracy."
        ),
        historical_months=historical
    )


@router.get("/anomalies", response_model=List[schemas.AnomalyOut])
def get_anomalies(
    threshold: float = Query(2.0, description="Z-score threshold for anomaly detection"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Detect anomalous expense transactions using Z-score analysis per category.
    Flags transactions where the amount is unusually high compared to the user's norm.
    """
    expense_txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense"
    ).order_by(models.Transaction.date.desc()).all()

    anomalies = detect_all_anomalies(expense_txns, z_threshold=threshold)
    return anomalies


@router.get("/trends")
def get_spending_trends(
    months: int = Query(6, ge=2, le=24),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Return monthly income vs expenses for the last N months.
    Useful for rendering line/bar charts on the frontend dashboard.
    """
    rows = (
        db.query(
            extract("year",  models.Transaction.date).label("year"),
            extract("month", models.Transaction.date).label("month"),
            models.Transaction.type,
            func.sum(models.Transaction.amount).label("total")
        )
        .filter(models.Transaction.user_id == current_user.id)
        .group_by("year", "month", models.Transaction.type)
        .order_by("year", "month")
        .all()
    )

    # Organise into dict keyed by "YYYY-MM"
    trend_map = {}
    for r in rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        if key not in trend_map:
            trend_map[key] = {"month": key, "income": 0.0, "expenses": 0.0}
        if str(r.type).replace("TransactionType.", "") == "income":
            trend_map[key]["income"] = round(r.total, 2)
        else:
            trend_map[key]["expenses"] = round(r.total, 2)

    # Return last N months
    sorted_months = sorted(trend_map.values(), key=lambda x: x["month"])
    return {"trends": sorted_months[-months:]}


@router.get("/category-trends")
def get_category_trends(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Per-category spending breakdown for a given month, formatted for pie/bar charts."""
    rows = (
        db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label("total")
        )
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            extract("month", models.Transaction.date) == month,
            extract("year", models.Transaction.date) == year
        )
        .group_by(models.Transaction.category)
        .all()
    )

    return {
        "month": month, "year": year,
        "categories": [{"category": r.category, "total": round(r.total, 2)} for r in rows]
    }
