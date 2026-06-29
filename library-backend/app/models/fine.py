from app.extensions import db
from datetime import datetime

class Fine(db.Model):
    __tablename__ = "fines"

    id = db.Column(db.Integer, primary_key=True)

    loan_id = db.Column(
        db.Integer,
        db.ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )                                 # also means fine still resolves to a person if loan is archived

    amount = db.Column(
        db.Numeric(10, 2),            # Numeric(10,2) = up to 10 digits, 2 decimal places
        nullable=False                # correct type for money — Float can have rounding errors
    )

    paid = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    paid_at = db.Column(
        db.DateTime,
        nullable=True                 # null until the fine is actually paid
    )

    # --- Relationships ---
    loan = db.relationship("Loan", back_populates="fines")
    user = db.relationship("User", back_populates="fines")

    def to_dict(self):
        return {
            "id":      self.id,
            "loan_id": self.loan_id,
            "user_id": self.user_id,
            "amount":  float(self.amount),   # convert Numeric to float for JSON serialization
            "paid":    self.paid,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None
        }