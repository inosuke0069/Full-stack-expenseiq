"""
ML Anomaly Detector – Unusual Spending Detection

Uses Z-score (standard deviation analysis) to identify transactions
that are statistically unusual compared to the user's spending history
within the same category.

This is a classic unsupervised anomaly detection technique widely
used in financial fraud and budget analysis systems.
"""

import numpy as np
from typing import List, Tuple
from collections import defaultdict


def check_anomaly(
    amount: float,
    past_amounts: List[float],
    z_threshold: float = 2.0
) -> Tuple[bool, float]:
    """
    Check if a single transaction amount is an anomaly.

    Parameters
    ----------
    amount       : The new transaction amount to evaluate.
    past_amounts : Historical amounts for the same category.
    z_threshold  : Number of standard deviations to flag as anomaly.

    Returns
    -------
    (is_anomaly: bool, z_score: float)
    """
    if len(past_amounts) < 3:
        return False, 0.0

    arr = np.array(past_amounts)
    mean = np.mean(arr)
    std  = np.std(arr)

    if std == 0:
        return False, 0.0

    z_score = (amount - mean) / std
    return float(z_score) > z_threshold, round(float(z_score), 3)


def detect_all_anomalies(
    transactions: list,
    z_threshold: float = 2.0
) -> List[dict]:
    """
    Scan all expense transactions and flag anomalies using per-category Z-scores.

    Parameters
    ----------
    transactions : List of ORM Transaction objects (type='expense')
    z_threshold  : Z-score threshold above which a transaction is flagged.

    Returns
    -------
    List of anomaly dictionaries suitable for the AnomalyOut schema.
    """
    # Group amounts by category
    category_amounts: dict = defaultdict(list)
    for t in transactions:
        category_amounts[t.category].append(t.amount)

    anomalies = []
    for t in transactions:
        amounts = category_amounts[t.category]
        if len(amounts) < 5:
            continue  # Not enough data for this category

        arr = np.array(amounts)
        mean = float(np.mean(arr))
        std  = float(np.std(arr))

        if std == 0:
            continue

        z_score = (t.amount - mean) / std

        if z_score > z_threshold:
            anomalies.append({
                "transaction_id": t.id,
                "amount":         t.amount,
                "category":       t.category,
                "description":    t.description,
                "date":           t.date,
                "mean_amount":    round(mean, 2),
                "std_dev":        round(std, 2),
                "z_score":        round(z_score, 3),
            })

    # Sort by most anomalous first
    anomalies.sort(key=lambda x: x["z_score"], reverse=True)
    return anomalies
