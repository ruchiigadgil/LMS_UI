import os
import sys
import requests

# Add project root to path so app can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.book import Book
from app.models.book_inventory_transaction import BookInventoryTransaction

BOOKS = [
    {
        "title": "The Alchemist",
        "author": "Paulo Coelho",
        "genre": "Fiction",
        "isbn": "9780062315007",
        "total_copies": 3,
    },
    {
        "title": "Atomic Habits",
        "author": "James Clear",
        "genre": "Self-Help",
        "isbn": "9780735211292",
        "total_copies": 2,
    },
    {
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "genre": "History",
        "isbn": "9780062316097",
        "total_copies": 2,
    },
    {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "genre": "Classic Fiction",
        "isbn": "9780743273565",
        "total_copies": 4,
    },
    {
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "genre": "Classic Fiction",
        "isbn": "9780061935466",
        "total_copies": 3,
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "genre": "Dystopian Fiction",
        "isbn": "9780451524935",
        "total_copies": 3,
    },
    {
        "title": "The Psychology of Money",
        "author": "Morgan Housel",
        "genre": "Finance",
        "isbn": "9780857197689",
        "total_copies": 2,
    },
    {
        "title": "Educated",
        "author": "Tara Westover",
        "genre": "Memoir",
        "isbn": "9780399590504",
        "total_copies": 2,
    },
    {
        "title": "Deep Work",
        "author": "Cal Newport",
        "genre": "Self-Help",
        "isbn": "9781455586691",
        "total_copies": 2,
    },
    {
        "title": "The Hitchhiker's Guide to the Galaxy",
        "author": "Douglas Adams",
        "genre": "Science Fiction",
        "isbn": "9780345391803",
        "total_copies": 3,
    },
]

COVERS_DIR = os.path.join("app", "static", "covers")


def download_cover(isbn):
    """Download cover from Open Library. Returns local path or None."""
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
    dest = os.path.join(COVERS_DIR, f"{isbn}.jpg")

    if os.path.exists(dest):
        print(f"  Cover already exists: {isbn}.jpg")
        return f"/static/covers/{isbn}.jpg"

    try:
        r = requests.get(url, timeout=10)
        # Open Library returns a 1x1 gif for missing covers
        if r.status_code == 200 and len(r.content) > 1000:
            with open(dest, "wb") as f:
                f.write(r.content)
            print(f"  Downloaded cover: {isbn}.jpg")
            return f"/static/covers/{isbn}.jpg"
        else:
            print(f"  No cover found for ISBN {isbn}, will use placeholder")
            return None
    except Exception as e:
        print(f"  Cover download failed for {isbn}: {e}")
        return None


def seed():
    app = create_app()

    with app.app_context():
        # Create covers directory if it doesn't exist
        os.makedirs(COVERS_DIR, exist_ok=True)

        existing = Book.query.count()
        if existing > 0:
            print(f"Database already has {existing} book(s).")
            answer = input("Add more books anyway? (y/n): ").strip().lower()
            if answer != "y":
                print("Seed cancelled.")
                return

        print(f"\nSeeding {len(BOOKS)} books...\n")

        for data in BOOKS:
            print(f"Processing: {data['title']}")

            cover_path = download_cover(data["isbn"])

            book = Book(
                title=data["title"],
                author=data["author"],
                genre=data["genre"],
                isbn=data["isbn"],
                total_copies=data["total_copies"],
                cover_image_url=cover_path,
            )
            db.session.add(book)
            db.session.flush()  # get book.id before committing

            # Log acquisition transaction (mirrors POST /api/admin/books logic)
            txn = BookInventoryTransaction(
                book_id=book.id,
                change_type="acquisition",
                quantity_delta=data["total_copies"],
                note="Initial seed",
            )
            db.session.add(txn)

        db.session.commit()
        print(f"\nDone. {len(BOOKS)} books added to the database.")
        print("Cover images saved to: app/static/covers/")


if __name__ == "__main__":
    seed()