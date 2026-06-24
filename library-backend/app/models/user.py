from app.extensions import db        # import the shared db instance we created in extensions.py
from datetime import datetime         # for the default timestamp on created_at

class User(db.Model):
    __tablename__ = "users"           # exact name of the table in PostgreSQL

    # --- Columns ---
    id = db.Column(
        db.Integer,
        primary_key=True              # auto-incrementing integer PK, PostgreSQL handles this
    )

    name = db.Column(
        db.String(120),
        nullable=False                # name is required, cannot be empty
    )

    email = db.Column(
        db.String(120),
        unique=True,                  # no two users can share an email
        nullable=False
    )

    phone = db.Column(db.String(15), nullable=True)
    
    password_hash = db.Column(
        db.String(255),               # bcrypt hashes are ~60 chars but 255 gives safe headroom
        nullable=False
    )

    role = db.Column(
        db.Enum("admin", "member", name="user_role"),  # name= creates a named enum type in Postgres
        nullable=False,
        default="member"              # every new signup is a member, not an admin
    )

    membership_status = db.Column(
        db.Enum(
            "not_availed",   # registered but never paid — can browse, cannot borrow
            "active",        # paid and valid — full access
            "expired",       # was a member, membership lapsed — needs renewal
            "suspended",     # blocked due to unpaid fines or overdue books
            name="membership_status_enum"
        ),
        nullable=False,
        default="not_availed"         # every new user starts here
    )

    membership_expiry = db.Column(
        db.Date,
        nullable=True                 # null when not_availed — no expiry date yet
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow       # automatically set to now when row is created
    )

    # --- Relationships ---
    # these let you do user.loans, user.fines etc. in Python
    # back_populates connects both sides — loan.user also works
    loans        = db.relationship("Loan",        back_populates="user")
    fines        = db.relationship("Fine",        back_populates="user")
    payments     = db.relationship("Payment",     back_populates="user")
    reservations = db.relationship("Reservation", back_populates="user")

    # --- Serializer ---
    def to_dict(self):
        # controls exactly what JSON goes to the frontend
        # password_hash is deliberately never included here
        return {
            "id":                self.id,
            "name":              self.name,
            "email":             self.email,
            "role":              self.role,
            "membership_status": self.membership_status,
            "membership_expiry": str(self.membership_expiry) if self.membership_expiry else None,
            "created_at":        self.created_at.isoformat()
        }