from app.extensions import db
from datetime import datetime

class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.Integer, primary_key=True)

    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    requested_at = db.Column(
        db.DateTime,
        default=datetime.utcnow       # queue order is determined by this — earliest = first in line
    )

    status = db.Column(
        db.Enum(
            "waiting",    # in the queue, book still not available
            "ready",      # a copy just came back — this member is next, notified
            "expired",    # member didn't show up within 3 days of ready — skipped
            "fulfilled",  # member came in, admin issued the book — reservation complete
            name="reservation_status_enum"
        ),
        nullable=False,
        default="waiting"
    )

    # --- Relationships ---
    book = db.relationship("Book", back_populates="reservations")
    user = db.relationship("User", back_populates="reservations")

    def to_dict(self):
        return {
            "id":           self.id,
            "book_id":      self.book_id,
            "user_id":      self.user_id,
            "requested_at": self.requested_at.isoformat(),
            "status":       self.status
        }