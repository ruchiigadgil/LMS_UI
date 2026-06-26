import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.book import Book
from app.models.loan import Loan
from app.models.reservation import Reservation
from app.models.fine import Fine
from app.models.book_inventory_transaction import BookInventoryTransaction

def cleanup_duplicates():
    app = create_app()

    with app.app_context():
        # Find all ISBNs that have duplicates
        all_books = Book.query.all()

        isbn_books = {}
        for book in all_books:
            if book.isbn:
                if book.isbn not in isbn_books:
                    isbn_books[book.isbn] = []
                isbn_books[book.isbn].append(book)

        duplicates_found = 0
        books_to_delete = []

        for isbn, books in isbn_books.items():
            if len(books) > 1:
                duplicates_found += 1
                print(f"\nDuplicate ISBN: {isbn}")

                # Keep the first one (lowest ID), delete the rest
                books_sorted = sorted(books, key=lambda b: b.id)
                keep = books_sorted[0]
                delete_list = books_sorted[1:]

                print(f"  Keeping: ID {keep.id} - {keep.title}")
                for dup in delete_list:
                    print(f"  Deleting: ID {dup.id} - {dup.title}")
                    books_to_delete.append(dup)

        if not books_to_delete:
            print("No duplicates found!")
            return

        print(f"\n{len(books_to_delete)} duplicate book(s) will be deleted.")
        confirm = input("Proceed? (y/n): ").strip().lower()

        if confirm != 'y':
            print("Cancelled.")
            return

        for book in books_to_delete:
            book_id = book.id

            # Delete related reservations
            Reservation.query.filter_by(book_id=book_id).delete()

            # Delete related fines (via loans)
            loan_ids = [l.id for l in Loan.query.filter_by(book_id=book_id).all()]
            if loan_ids:
                Fine.query.filter(Fine.loan_id.in_(loan_ids)).delete(synchronize_session=False)

            # Delete related loans
            Loan.query.filter_by(book_id=book_id).delete()

            # Delete inventory transactions
            BookInventoryTransaction.query.filter_by(book_id=book_id).delete()

            # Delete the book
            db.session.delete(book)

        db.session.commit()
        print(f"\nDone! Deleted {len(books_to_delete)} duplicate book(s).")


if __name__ == "__main__":
    cleanup_duplicates()
