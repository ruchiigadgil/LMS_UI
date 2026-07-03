from app.extensions import db
from datetime import datetime

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    rating = db.Column(db.Integer, nullable=False)   # 1 to 5 stars

    text = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        # one review per user per book — posting again updates the existing one
        db.UniqueConstraint("user_id", "book_id", name="uq_review_user_book"),
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
    )

    # --- Relationships ---
    user = db.relationship("User", back_populates="reviews")
    book = db.relationship("Book", back_populates="reviews")

    def to_dict(self):
        return {
            "id":         self.id,
            "user_id":    self.user_id,
            "user_name":  self.user.name if self.user else None,
            "book_id":    self.book_id,
            "book_title": self.book.title if self.book else None,
            "rating":     self.rating,
            "text":       self.text,
            "created_at": self.created_at.isoformat()
        }
