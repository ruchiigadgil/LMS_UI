from app.extensions import db
from datetime import datetime

class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    type = db.Column(
        db.Enum(
            "membership",  # user paid the membership fee
            "fine",        # user paid an outstanding fine
            name="payment_type_enum"
        ),
        nullable=False
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    method = db.Column(
        db.String(50),
        nullable=True                 # e.g. "UPI", "card", "cash"
    )

    # --- Relationships ---
    user = db.relationship("User", back_populates="payments")

    def to_dict(self):
        return {
            "id":      self.id,
            "user_id": self.user_id,
            "type":    self.type,
            "amount":  float(self.amount),
            "date":    self.date.isoformat(),
            "method":  self.method
        }