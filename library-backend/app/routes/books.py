from flask import Blueprint, jsonify
from app.models.book import Book

books_bp = Blueprint("books", __name__)

@books_bp.route("/", methods=["GET"])
def get_books():
    books = Book.query.all()
    return jsonify([b.to_dict() for b in books]), 200