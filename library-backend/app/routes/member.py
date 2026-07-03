from flask import Blueprint, request, jsonify
from sqlalchemy import func
from app.extensions import db
from app.models.reservation import Reservation
from app.models.book import Book
from app.models.review import Review
from app.models.user import User
from app.models.loan import Loan

member_bp = Blueprint("member", __name__)


def _rating_stats(book_ids=None):
    """Return {book_id: (avg_rating, count)} for all (or given) books."""
    query = db.session.query(
        Review.book_id,
        func.avg(Review.rating),
        func.count(Review.id)
    )
    if book_ids is not None:
        if not book_ids:
            return {}
        query = query.filter(Review.book_id.in_(book_ids))
    rows = query.group_by(Review.book_id).all()
    return {row[0]: (float(row[1]), row[2]) for row in rows}


def _serialize_book(book, stats, reason=None):
    avg, cnt = stats.get(book.id, (None, 0))
    active = sum(1 for l in book.loans if l.status in ("active", "overdue"))
    data = {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "genre": book.genre,
        "isbn": book.isbn,
        "cover_image_url": book.cover_image_url,
        "avg_rating": round(avg, 1) if avg is not None else None,
        "ratings_count": cnt,
        "total_copies": book.total_copies,
        "available_copies": max(book.total_copies - active, 0),
    }
    if reason is not None:
        data["reason"] = reason
    return data


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


# ---- Reviews ----

@member_bp.route("/reviews", methods=["GET"])
def get_reviews():
    """All reviews, newest first. Optional ?book_id= filter."""
    query = Review.query
    book_id = request.args.get("book_id", type=int)
    if book_id:
        query = query.filter_by(book_id=book_id)

    reviews = query.order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews]), 200


@member_bp.route("/reviews", methods=["POST"])
def post_review():
    """Create a review. If the user already reviewed this book, update it."""
    data = request.get_json()

    user_id = data.get("user_id")
    book_id = data.get("book_id")
    rating = data.get("rating")
    text = (data.get("text") or "").strip()

    if not user_id or not book_id:
        return jsonify({"error": "user_id and book_id are required"}), 400
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "rating must be an integer between 1 and 5"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    book = Book.query.get(book_id)
    if not book:
        return jsonify({"error": "Book not found"}), 404

    from datetime import datetime

    review = Review.query.filter_by(user_id=user_id, book_id=book_id).first()
    if review:
        review.rating = rating
        review.text = text
        review.created_at = datetime.utcnow()
        updated = True
    else:
        review = Review(user_id=user_id, book_id=book_id, rating=rating, text=text)
        db.session.add(review)
        updated = False

    db.session.commit()

    payload = review.to_dict()
    payload["updated"] = updated
    return jsonify(payload), 200 if updated else 201


@member_bp.route("/reviews/<int:review_id>", methods=["DELETE"])
def delete_review(review_id):
    review = Review.query.get(review_id)
    if not review:
        return jsonify({"error": "Review not found"}), 404

    db.session.delete(review)
    db.session.commit()
    return jsonify({"message": "Review deleted", "review_id": review_id}), 200


# ---- Recommendations ----

BAYES_M = 3  # minimum ratings weight for the bayesian average


@member_bp.route("/recommendations/<int:user_id>", methods=["GET"])
def get_recommendations(user_id):
    """Personalized picks: 'your next read' + 'books you might like'.

    Signals: ratings (strong) and loan history (mild). Score is a weighted
    blend of genre affinity, author affinity, and bayesian-average popularity.
    Cold start (no history) falls back to most popular books.
    """
    # --- User history ---
    borrowed_ids = {l.book_id for l in Loan.query.filter_by(user_id=user_id).all()}
    rated = {r.book_id: r.rating for r in Review.query.filter_by(user_id=user_id).all()}
    history_ids = borrowed_ids | set(rated.keys())

    all_books = Book.query.filter(Book.total_copies > 0).all()
    books_by_id = {b.id: b for b in all_books}

    # --- Popularity (bayesian average so few-vote books don't dominate) ---
    stats = _rating_stats()
    total_votes = sum(c for _, c in stats.values())
    global_avg = (
        sum(a * c for a, c in stats.values()) / total_votes
        if total_votes else 3.5
    )

    def bayes(book_id):
        avg, cnt = stats.get(book_id, (None, 0))
        if cnt == 0:
            return global_avg * 0.8  # unrated books rank below the global mean
        return (cnt / (cnt + BAYES_M)) * avg + (BAYES_M / (cnt + BAYES_M)) * global_avg

    candidates = [b for b in all_books if b.id not in history_ids]

    # --- Cold start: most popular books ---
    if not history_ids:
        ranked = sorted(candidates, key=lambda b: bayes(b.id), reverse=True)
        might_like = [_serialize_book(b, stats, "Popular with readers") for b in ranked[:6]]
        next_read = next((x for x in might_like if x["available_copies"] > 0),
                         might_like[0] if might_like else None)
        return jsonify({"next_read": next_read, "might_like": might_like}), 200

    # --- Taste profile: genre + author affinity ---
    genre_aff, author_aff = {}, {}
    for bid in history_ids:
        b = books_by_id.get(bid)
        if not b:
            continue
        rating = rated.get(bid)
        if rating is None:
            weight = 1.0            # borrowed but not rated: mild positive
        elif rating >= 4:
            weight = 2.0            # loved it
        elif rating == 3:
            weight = 0.5            # lukewarm
        else:
            weight = -1.0           # disliked: negative signal
        if b.genre:
            genre_aff[b.genre] = genre_aff.get(b.genre, 0) + weight
        if b.author:
            author_aff[b.author] = author_aff.get(b.author, 0) + weight

    max_g = max(genre_aff.values()) if genre_aff else 0
    max_a = max(author_aff.values()) if author_aff else 0

    # --- Score candidates: 0.5 genre + 0.3 author + 0.2 popularity ---
    scored = []
    for b in candidates:
        g = (genre_aff.get(b.genre, 0) / max_g) if max_g > 0 else 0
        a = (author_aff.get(b.author, 0) / max_a) if max_a > 0 else 0
        pop = bayes(b.id) / 5
        scored.append((0.5 * g + 0.3 * a + 0.2 * pop, b))
    scored.sort(key=lambda t: t[0], reverse=True)

    might_like = []
    for score, b in scored[:6]:
        if author_aff.get(b.author, 0) > 0:
            reason = f"By {b.author}, an author you enjoy"
        elif genre_aff.get(b.genre, 0) > 0:
            reason = f"Because you like {b.genre}"
        else:
            reason = "Popular with readers"
        might_like.append(_serialize_book(b, stats, reason))

    next_read = next((x for x in might_like if x["available_copies"] > 0),
                     might_like[0] if might_like else None)

    return jsonify({"next_read": next_read, "might_like": might_like}), 200


@member_bp.route("/books/<int:book_id>/also-read", methods=["GET"])
def get_also_read(book_id):
    """'Readers of this book also read' — item-to-item co-occurrence over
    loans + reviews, ranked by shared-reader count then average rating."""
    loan_users = db.session.query(Loan.user_id).filter(Loan.book_id == book_id)
    review_users = db.session.query(Review.user_id).filter(Review.book_id == book_id)
    user_ids = {row[0] for row in loan_users.union(review_users).all()}

    if not user_ids:
        return jsonify([]), 200

    other_loans = db.session.query(Loan.user_id, Loan.book_id).filter(
        Loan.user_id.in_(user_ids), Loan.book_id != book_id).all()
    other_reviews = db.session.query(Review.user_id, Review.book_id).filter(
        Review.user_id.in_(user_ids), Review.book_id != book_id).all()

    co_counts = {}
    for _, bid in set(other_loans) | set(other_reviews):  # distinct user-book pairs
        co_counts[bid] = co_counts.get(bid, 0) + 1

    if not co_counts:
        return jsonify([]), 200

    stats = _rating_stats(set(co_counts.keys()))
    books = Book.query.filter(Book.id.in_(co_counts.keys()), Book.total_copies > 0).all()
    ranked = sorted(
        books,
        key=lambda b: (co_counts[b.id], stats.get(b.id, (0, 0))[0]),
        reverse=True
    )[:6]

    result = []
    for b in ranked:
        data = _serialize_book(b, stats)
        data["shared_readers"] = co_counts[b.id]
        result.append(data)

    return jsonify(result), 200