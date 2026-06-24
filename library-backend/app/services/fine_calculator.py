from datetime import date
from flask import current_app

def calculate_fine(loan, today=None):
    if today is None:
        today = date.today()

    GRACE_PERIOD_DAYS = current_app.config["FINE_GRACE_PERIOD"]  # changed
    FINE_RATE_PER_DAY = current_app.config["FINE_RATE_PER_DAY"]
    FINE_MAX_CAP = current_app.config["FINE_MAX_CAP"]
    LOST_THRESHOLD_DAYS = current_app.config["FINE_LOST_THRESHOLD_DAYS"]

    end_date = loan.return_date if loan.return_date else today

    days_overdue = (end_date - loan.due_date).days - GRACE_PERIOD_DAYS

    if days_overdue <= 0:
        return 0

    if days_overdue >= LOST_THRESHOLD_DAYS:
        return FINE_MAX_CAP

    fine = days_overdue * FINE_RATE_PER_DAY
    return min(fine, FINE_MAX_CAP)