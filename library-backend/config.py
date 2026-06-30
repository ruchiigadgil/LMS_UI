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

    UPLOAD_FOLDER=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'static', 'covers')
    MAX_CONTENT_LENGTH=5 * 1024 * 1024
    ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg', 'webp'}
    COVER_MIN_WIDTH=300
    COVER_MAX_WIDTH=1200
    COVER_MIN_HEIGHT=400
    COVER_MAX_HEIGHT=1800

