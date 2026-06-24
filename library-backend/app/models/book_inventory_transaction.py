# app/models/book_inventory_transaction.py

from app.extensions import db
from datetime import datetime
import enum

class ChangeType(enum.Enum):
    acquisition = "acquisition"
    issue = "issue"
    return_ = "return"
    lost = "lost"
    damaged = "damaged"
    decommission = "decommission"

class BookInventoryTransaction(db.Model):
    __tablename__ = "book_inventory_transactions"

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False)
    change_type = db.Column(db.Enum(ChangeType), nullable=False)
    quantity_delta = db.Column(db.Integer, nullable=False)  # +ve or -ve
    note = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    book = db.relationship("Book", backref="inventory_transactions")