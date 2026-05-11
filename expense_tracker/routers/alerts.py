"""
Alerts Router – /api/alerts
Retrieve budget and anomaly alert history for the current user
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter()


@router.get("/", response_model=List[schemas.AlertLogOut])
def get_alerts(
    limit: int = Query(20, le=100),
    alert_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Return the alert history for the current user.
    Optionally filter by alert_type: 'budget_exceeded', 'budget_warning', 'anomaly'.
    """
    query = db.query(models.AlertLog).filter(models.AlertLog.user_id == current_user.id)
    if alert_type:
        query = query.filter(models.AlertLog.alert_type == alert_type)
    return query.order_by(models.AlertLog.sent_at.desc()).limit(limit).all()
