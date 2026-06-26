from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.reservation import Reservation
from app.models.book import Book

member_bp = Blueprint("member", __name__)


@member_bp.route("/reservations/<int:user_id>", methods=["GET"])
def get_member_reservations(user_id):
    """Get all active reservations for a member with their queue position."""
    reservations = Reservation.query.filter_by(user_id=user_id).filter(
        Reservation.status.in_(["waiting", "ready"])
    ).order_by(Reservation.requested_at.desc()).all()

    result = []
    for r in reservations:
        # Calculate queue position for this reservation
        queue_position = Reservation.query.filter(
            Reservation.book_id == r.book_id,
            Reservation.status.in_(["waiting", "ready"]),
            Reservation.requested_at <= r.requested_at
        ).count()

        result.append({
            "reservation_id": r.id,
            "book_id": r.book_id,
            "book_title": r.book.title,
            "book_author": r.book.author,
            "requested_at": r.requested_at.isoformat(),
            "status": r.status,
            "queue_position": queue_position
        })

    return jsonify(result), 200