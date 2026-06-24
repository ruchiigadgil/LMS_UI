# app/routes/admin.py
import os
import requests

from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.book import Book
from app.models.book_inventory_transaction import BookInventoryTransaction, ChangeType
from app.models.loan import Loan
from app.models.user import User
from datetime import date, timedelta
from app.services.fine_calculator import calculate_fine
from app.models.fine import Fine
from app.models.reservation import Reservation

admin_bp = Blueprint("admin", __name__)

def fetch_and_save_cover(isbn):
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
    dest = os.path.join("app", "static", "covers", f"{isbn}.jpg")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200 and len(r.content) > 1000:
            with open(dest, "wb") as f:
                f.write(r.content)
            return f"/static/covers/{isbn}.jpg"
    except:
        pass
    return None

@admin_bp.route("/books", methods=["POST"])
def add_book():
    data = request.get_json()

    # Validate required fields
    if not data.get("title") or not data.get("author") or not data.get("total_copies"):
        return jsonify({"error": "title, author and total_copies are required"}), 400

    book = Book(
        title=data["title"],
        author=data["author"],
        genre=data.get("genre"),
        isbn=data.get("isbn"),
        total_copies=data["total_copies"],
        cover_image_url=fetch_and_save_cover(data.get("isbn")) if data.get("isbn") else data.get("cover_image_url")
    )
    db.session.add(book)
    db.session.flush()  # so book.id is available before commit

    transaction = BookInventoryTransaction(
        book_id=book.id,
        change_type=ChangeType.acquisition,
        quantity_delta=data["total_copies"],
        note=data.get("note", "Initial acquisition")
    )
    db.session.add(transaction)
    db.session.commit()

    return jsonify({
        "message": "Book added successfully",
        "book_id": book.id
    }), 201



@admin_bp.route("loans/issue",methods=["POST"])
def issue_loan():
    data= request.get_json()
    user_id=data.get("user_id")
    book_id=data.get("book_id")

    if not user_id or not book_id:
        return jsonify({"error": "user_id and book_id are required"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    book = Book.query.with_for_update().filter_by(id=book_id).first()
    if not book:
        return jsonify({"error": "Book not found"}), 404
    
    active_loans = Loan.query.filter(
        Loan.book_id == book_id,
        Loan.status.in_(["active", "overdue"])
    ).count()
    available = book.total_copies - active_loans

    if available <= 0:
        return jsonify({"error": "No copies available. Add member to waitlist instead."})
    
    existing = Loan.query.filter_by(user_id=user_id, book_id=book_id).filter(
        Loan.status.in_(["active", "overdue"])
    ).first()
    if existing:
        return jsonify({"error": "Member already has this book issued"}), 400
    
    active_count = Loan.query.filter_by(user_id=user_id).filter(
        Loan.status.in_(["active", "overdue"])
    ).count()
    if active_count >= 5:
        return jsonify({"error": "Member already has 5 books issued. Cannot issue more."}), 400

    today = date.today()
    loan = Loan(
        user_id=user_id,
        book_id=book_id,
        issue_date=today,
        due_date=today + timedelta(days=14),
        status="active",
        renewal_count=0
    )
    db.session.add(loan)

    reservation = Reservation.query.filter_by(
    user_id=user_id,
    book_id=book_id,
    status="ready"
    ).first()

    if reservation:
        reservation.status = "fulfilled"

    db.session.commit()

    return jsonify({
        "message": "Book issued successfully",
        "loan_id": loan.id,
        "issue_date": str(loan.issue_date),
        "due_date": str(loan.due_date)
    }), 201



@admin_bp.route("/loans/<int:loan_id>/return", methods=["POST"])
def return_loan(loan_id):
    loan = Loan.query.get(loan_id)
    if not loan:
        return jsonify({"error": "Loan not found"}), 404

    if loan.status not in ["active", "overdue"]:
        return jsonify({"error": f"Cannot return a loan with status '{loan.status}'"}), 400

    today = date.today()
    loan.return_date = today

    fine_amount = calculate_fine(loan, today)

    if fine_amount > 0:
        fine = Fine(
            loan_id=loan.id,
            user_id=loan.user_id,
            amount=fine_amount
        )
        db.session.add(fine)
        loan.status = "returned"
    else:
        loan.status = "returned"


    next_reservation = Reservation.query.filter_by(
    book_id=loan.book_id,
    status="waiting"
    ).order_by(Reservation.requested_at.asc()).first()

    if next_reservation:
        next_reservation.status = "ready"

    db.session.commit()

    return jsonify({
        "message": "Book returned successfully",
        "loan_id": loan.id,
        "return_date": str(today),
        "fine_amount": float(fine_amount) if fine_amount else 0
    }), 200


@admin_bp.route("/reservations", methods=["POST"])
def add_reservation():
    data = request.get_json()

    user_id = data.get("user_id")
    book_id = data.get("book_id")

    if not user_id or not book_id:
        return jsonify({"error": "user_id and book_id are required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    book = Book.query.get(book_id)
    if not book:
        return jsonify({"error": "Book not found"}), 404

    # Check if copies are actually available — if yes, just issue directly
    active_loans = Loan.query.filter(
        Loan.book_id == book_id,
        Loan.status.in_(["active", "overdue"])
    ).count()
    available = book.total_copies - active_loans

    if available > 0:
        return jsonify({"error": f"{available} copies available. Issue directly instead of reserving."}), 400

    # Check member isn't already waiting for this book
    existing = Reservation.query.filter_by(
        user_id=user_id,
        book_id=book_id,
        status="waiting"
    ).first()
    if existing:
        return jsonify({"error": "Member is already in the waitlist for this book"}), 400

    reservation = Reservation(
        user_id=user_id,
        book_id=book_id,
        status="waiting"
    )
    db.session.add(reservation)
    db.session.flush()

    # Calculate queue position
    position = Reservation.query.filter_by(
        book_id=book_id,
        status="waiting"
    ).count()



    db.session.commit()

    return jsonify({
        "message": "Member added to waitlist",
        "reservation_id": reservation.id,
        "queue_position": position
    }), 201


@admin_bp.route("/books", methods=["GET"])
def get_books():
    books = Book.query.all()
    
    result = []
    for book in books:
        active_loans = Loan.query.filter(
            Loan.book_id == book.id,
            Loan.status.in_(["active", "overdue"])
        ).count()
        
        result.append({
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "genre": book.genre,
            "isbn": book.isbn,
            "total_copies": book.total_copies,
            "available_copies": book.total_copies - active_loans,
            "cover_image_url": book.cover_image_url
        })
    
    return jsonify(result), 200



@admin_bp.route("/members", methods=["GET"])
def get_members():
    members = User.query.filter_by(role="member").all()

    result = []
    for member in members:
        active_loans = Loan.query.filter_by(user_id=member.id).filter(
            Loan.status.in_(["active", "overdue"])
        ).count()

        result.append({
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "membership_status": member.membership_status,
            "active_loans": active_loans
        })

    return jsonify(result), 200


@admin_bp.route("/members", methods=["POST"])
def add_member():
    data = request.get_json()

    if not data.get("name") or not data.get("email"):
        return jsonify({"error": "name and email are required"}), 400

    # Check email not already registered
    existing = User.query.filter_by(email=data["email"]).first()
    if existing:
        return jsonify({"error": "A member with this email already exists"}), 400

    member = User(
        name=data["name"],
        email=data["email"],
        phone=data.get("phone"),
        password_hash="dummy_hash",  # no auth yet
        role="member",
        membership_status="active"
    )
    db.session.add(member)
    db.session.commit()

    return jsonify({
        "message": "Member added successfully",
        "member_id": member.id
    }), 201

@admin_bp.route("/loans/active", methods=["GET"])
def get_active_loans():
    loans = Loan.query.filter(
        Loan.status.in_(["active", "overdue"])
    ).all()

    result = []
    for loan in loans:
        result.append({
            "loan_id": loan.id,
            "user_id": loan.user_id,
            "user_name": loan.user.name,
            "book_id": loan.book_id,
            "book_title": loan.book.title,
            "issue_date": str(loan.issue_date),
            "due_date": str(loan.due_date),
            "status": loan.status,
            "renewal_count": loan.renewal_count
        })

    return jsonify(result), 200