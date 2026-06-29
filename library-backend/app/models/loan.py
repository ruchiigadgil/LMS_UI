from app.extensions import db
from datetime import datetime

class Loan(db.Model):
    __tablename__ = "loans"

    id = db.Column(db.Integer, primary_key=True)

    # --- Foreign Keys ---
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id"),
        nullable=False
    )

    # --- Dates ---
    issue_date = db.Column(
        db.Date,
        nullable=True                 # null until admin physically hands over the book
    )

    due_date = db.Column(
        db.Date,
        nullable=True                 # set by admin at confirmation = issue_date + 14 days
    )

    return_date = db.Column(
        db.Date,
        nullable=True                 # null while the loan is active, set when returned
    )

    # --- Status ---
    status = db.Column(
        db.Enum(
            "requested",  # user clicked Request — book not yet handed over physically
            "active",     # admin confirmed handover — book is with the member
            "returned",   # book handed back, return_date is set
            "overdue",    # active loan past due_date — fine accruing
            "lost",       # overdue beyond 45 days — charged replacement cost
            name="loan_status_enum"
        ),
        nullable=False,
        default="requested"           # every loan starts as requested
    )

    renewal_count = db.Column(
        db.Integer,
        default=0                     # tracks how many times this loan has been renewed
    )                                 # max 2 renewals; also blocked if a reservation exists

    # --- Relationships ---
    user  = db.relationship("User",  back_populates="loans")
    book  = db.relationship("Book",  back_populates="loans")
    fines = db.relationship("Fine",  back_populates="loan")

    def to_dict(self):
        return {
            "id":            self.id,
            "user_id":       self.user_id,
            "book_id":       self.book_id,
            "issue_date":    str(self.issue_date)   if self.issue_date   else None,
            "due_date":      str(self.due_date)     if self.due_date     else None,
            "return_date":   str(self.return_date)  if self.return_date  else None,
            "status":        self.status,
            "renewal_count": self.renewal_count
        }