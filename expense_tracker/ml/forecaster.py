"""
ML Forecaster – Expense Prediction using Linear Regression (scikit-learn)

Trains a simple Linear Regression model on the user's historical monthly
spending totals and predicts the next month's expected expenditure.
"""

import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List


def forecast_next_month(monthly_totals: List[float]) -> float:
    """
    Predict the next month's expense total using Linear Regression.

    Parameters
    ----------
    monthly_totals : list of float
        Chronologically ordered list of monthly expense totals.
        Example: [12000.0, 13500.0, 11800.0, 14200.0]

    Returns
    -------
    float
        Predicted expense amount for the next month.
    """
    if len(monthly_totals) < 2:
        return monthly_totals[0] if monthly_totals else 0.0

    # Feature: time index (0, 1, 2, …, n-1)
    X = np.arange(len(monthly_totals)).reshape(-1, 1)
    y = np.array(monthly_totals)

    model = LinearRegression()
    model.fit(X, y)

    # Predict the next time step
    next_index = np.array([[len(monthly_totals)]])
    prediction = model.predict(next_index)[0]

    # Clamp to non-negative
    return max(0.0, float(prediction))


def forecast_category(category_monthly: List[float]) -> float:
    """
    Same as forecast_next_month but intended for per-category forecasting.
    Falls back to the mean when there's insufficient data.
    """
    if not category_monthly:
        return 0.0
    if len(category_monthly) < 2:
        return float(np.mean(category_monthly))
    return forecast_next_month(category_monthly)
