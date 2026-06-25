// src/pages/admin/BooksPage.jsx
import React, { useState, useEffect } from 'react';
import { useAdminHeader } from '../../layouts/AdminShell';
import { getBooks, addBook } from '../../api/api';
import { useToast } from '../../components/Toast';
import BookCard from '../../components/BookCard';
import BookDetailOverlay from "../../components/BookDetailOverlay";
import Modal from '../../components/Modal';
import styles from './BooksPage.module.css';

export default function BooksPage() {
  const setHeader = useAdminHeader();
  const toast = useToast();

  const [books, setBooks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawers / Modals open state
  const [selectedBook, setSelectedBook] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Add Book Form state
  const [addForm, setAddForm] = useState({
    title: '',
    author: '',
    genre: '',
    isbn: '',
    total_copies: 1,
    cover_image_url: ''
  });

  // Fetch books on mount
  useEffect(() => {
    if (books !== null) return;
    
    setLoading(true);
    getBooks()
      .then(data => {
        setBooks(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch book catalog');
      })
      .finally(() => setLoading(false));
  }, []);

  // Update header title and action button
  useEffect(() => {
    setHeader({
      title: 'Books',
      action: (
        <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
          <span>➕</span> Add Book
        </button>
      )
    });
  }, [setHeader]);

  // Client-side search filter
  const filteredBooks = (books || []).filter(book => {
    const q = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(q) ||
      (book.author && book.author.toLowerCase().includes(q)) ||
      (book.genre && book.genre.toLowerCase().includes(q)) ||
      (book.isbn && book.isbn.toLowerCase().includes(q))
    );
  });

  // --- Handlers ---
  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!addForm.title || !addForm.author || !addForm.total_copies) {
      toast.error('Title, Author, and Total Copies are required');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await addBook(addForm);
      toast.success('Book added successfully');
      
      const newBook = {
        id: res.book_id,
        title: addForm.title,
        author: addForm.author,
        genre: addForm.genre,
        isbn: addForm.isbn,
        total_copies: Number(addForm.total_copies),
        available_copies: Number(addForm.total_copies),
        cover_image_url: addForm.cover_image_url
      };

      // Mutation: append new book
      setBooks(prev => [...(prev || []), newBook]);

      // Reset
      setAddForm({
        title: '',
        author: '',
        genre: '',
        isbn: '',
        total_copies: 1,
        cover_image_url: ''
      });
      setIsAddModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add book');
    } finally {
      setSubmittingAdd(false);
    }
  }

  function handleBookUpdated(updatedBook) {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    // If it's the currently open drawer book, update it
    if (selectedBook && selectedBook.id === updatedBook.id) {
      setSelectedBook(updatedBook);
    }
  }

  function handleBookDeleted(deletedId) {
    setBooks(prev => prev.filter(b => b.id !== deletedId));
    setSelectedBook(null);
  }

  return (
    <div className={styles.container}>
      {/* Search bar */}
      <div className={styles.searchBarWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Filter by title, author, genre, or ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <span
            className="spinner"
            style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
          ></span>
          <p style={{ marginTop: "12px" }}>Loading books...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: "var(--verso-danger)", fontWeight: "bold" }}>
            {error}
          </p>
          <button
            onClick={() => {
              setBooks(null);
              setLoading(true);
            }}
            style={{ marginTop: "12px", textDecoration: "underline" }}
          >
            Retry Loading
          </button>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className={styles.noResults}>
          No books found matching "{searchQuery}"
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onClick={() => setSelectedBook(book)}
            />
          ))}
        </div>
      )}

      {/* Book Detail Drawer */}
      <BookDetailOverlay
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onUpdate={handleBookUpdated}
        onDelete={handleBookDeleted}
        isAdmin={true}
      />

      {/* Add Book Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Book"
      >
        <form onSubmit={handleAddSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Book Title *</label>
            <input
              type="text"
              className={styles.input}
              value={addForm.title}
              onChange={(e) =>
                setAddForm({ ...addForm, title: e.target.value })
              }
              required
              disabled={submittingAdd}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Author *</label>
            <input
              type="text"
              className={styles.input}
              value={addForm.author}
              onChange={(e) =>
                setAddForm({ ...addForm, author: e.target.value })
              }
              required
              disabled={submittingAdd}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Genre</label>
              <input
                type="text"
                className={styles.input}
                value={addForm.genre}
                onChange={(e) =>
                  setAddForm({ ...addForm, genre: e.target.value })
                }
                placeholder="e.g. Fiction"
                disabled={submittingAdd}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>ISBN</label>
              <input
                type="text"
                className={styles.input}
                value={addForm.isbn}
                onChange={(e) =>
                  setAddForm({ ...addForm, isbn: e.target.value })
                }
                placeholder="e.g. 978-3-16..."
                disabled={submittingAdd}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Total Copies *</label>
              <input
                type="number"
                min="1"
                className={styles.input}
                value={addForm.total_copies}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    total_copies: Number(e.target.value),
                  })
                }
                required
                disabled={submittingAdd}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Cover Image URL</label>
              <input
                type="text"
                className={styles.input}
                value={addForm.cover_image_url}
                onChange={(e) =>
                  setAddForm({ ...addForm, cover_image_url: e.target.value })
                }
                placeholder="e.g. /static/covers/isbn.jpg"
                disabled={submittingAdd}
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={submittingAdd}
          >
            {submittingAdd ? (
              <>
                <span className="spinner"></span> Adding Book...
              </>
            ) : (
              "Add Book"
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
