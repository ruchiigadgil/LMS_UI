from app.extensions import db
from datetime import datetime

class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(
        db.String(255),
        nullable=False,
        index=True                    # index=True tells Postgres to index this column
    )                                 # makes search queries on title much faster

    author = db.Column(
        db.String(120),
        nullable=False,
        index=True
    )

    genre = db.Column(
        db.String(80),
        nullable=True,
        index=True
    )

    isbn = db.Column(
        db.String(20),
        nullable=True,
        index=True
    )

    total_copies = db.Column(
        db.Integer,
        nullable=False,
        default=1
    )
    
    cover_image_url = db.Column(db.String(500), nullable=True)                                # decremented when admin confirms issue
                                      # incremented when admin marks return

    added_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # --- Relationships ---
    loans        = db.relationship("Loan",        back_populates="book")
    reservations = db.relationship("Reservation", back_populates="book")

    @property
    def available_copies(self):
        active_loans = sum(
            1
            for loan in self.loans
            if loan.status in ("active", "overdue")
        )
        return max(self.total_copies - active_loans, 0)

    def to_dict(self):
        return {
        "id":               self.id,
        "title":            self.title,
        "author":           self.author,
        "genre":            self.genre,
        "isbn":             self.isbn,
        "total_copies":     self.total_copies,
        "available_copies": self.available_copies,
        "cover_image_url":  self.cover_image_url,  # add this line
        "added_at":         self.added_at.isoformat()
        }