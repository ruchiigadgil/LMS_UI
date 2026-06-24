// src/pages/member/BrowseBooksPage.jsx
import React, { useState, useEffect } from 'react';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getBooks } from '../../api/api';
import { useToast } from '../../components/Toast';
import BookCard from '../../components/BookCard';
import BookDetailOverlay from '../../components/BookDetailOverlay';
import Icon from '../../components/Icon';
import styles from './BrowseBooksPage.module.css';

export default function BrowseBooksPage() {
  const setHeader = useMemberHeader();
  const toast = useToast();

  const [books, setBooks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    setHeader({ title: 'Browse Books', action: null });
  }, [setHeader]);

  useEffect(() => {
    getBooks()
      .then(data => {
        setBooks(data);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load library catalog'))
      .finally(() => setLoading(false));
  }, []);

  const filteredBooks = (books || []).filter(book => {
    const q = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(q) ||
      (book.author && book.author.toLowerCase().includes(q)) ||
      (book.genre && book.genre.toLowerCase().includes(q)) ||
      (book.isbn && book.isbn.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.container}>
      <div className={styles.searchBarWrapper}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Search by title, author, genre, or ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading catalog...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className={styles.noResults}>
          No books found matching "{searchQuery}"
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredBooks.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onClick={() => setSelectedBook(book)}
            />
          ))}
        </div>
      )}

      {/* Book detail overlay */}
      {selectedBook && (
        <BookDetailOverlay
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}
