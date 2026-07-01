// src/pages/member/BrowseBooksPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getBooks } from '../../api/api';
import { useToast } from '../../components/Toast';
import BookShelf from '../../components/BookShelf';
import BookPreviewModal from '../../components/BookPreviewModal';
import Icon from '../../components/Icon';
import styles from './BrowseBooksPage.module.css';

const BOOKS_PER_SHELF = 4;

export default function BrowseBooksPage() {
  const toast = useToast();

  const [books, setBooks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);


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

  const shelves = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredBooks.length; i += BOOKS_PER_SHELF) {
      result.push(filteredBooks.slice(i, i + BOOKS_PER_SHELF));
    }
    return result;
  }, [filteredBooks]);

  return (
    <div className={styles.container}>
      <div className={styles.searchBarWrapper}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Search by title, genre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.titleBar}>
        <h2 className={styles.pageTitle}>Your Bookshelf</h2>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading catalog...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--verso-danger)', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className={styles.noResults}>
          No books found matching "{searchQuery}"
        </div>
      ) : (
        <div className={styles.shelvesArea}>
          {shelves.map((shelfBooks, index) => (
            <BookShelf
              key={index}
              books={shelfBooks}
              onBookClick={setSelectedBook}
            />
          ))}
        </div>
      )}

      <BookPreviewModal
        book={selectedBook}
        isOpen={selectedBook !== null}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
