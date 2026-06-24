import os
from dotenv import load_dotenv

load_dotenv()
class Config:
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS=False

    JWT_SECRET_KEY=os.environ.get("JWT_SECRET_KEY","to-be=changed-in-production")

    FINE_GRACE_PERIOD=2
    FINE_RATE_PER_DAY=10
    FINE_MAX_CAP=500
    FINE_LOST_THRESHOLD_DAYS=45
    LOAN_PERIOD_DAYS=14
    MAX_RENEWALS=2
    MAX_BOOKS_PER_MEMBER=5

