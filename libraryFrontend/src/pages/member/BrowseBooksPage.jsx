// src/pages/member/BrowseBooksPage.jsx
import React, { useState, useEffect } from 'react';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getBooks } from '../../api/api';
import { useToast } from '../../components/Toast';
import BookCard from '../../components/BookCard';
import Drawer from '../../components/Drawer';
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

  const selectedCoverUrl = selectedBook?.cover_image_url
    ? (selectedBook.cover_image_url.startsWith('http')
        ? selectedBook.cover_image_url
        : `http://localhost:5005${selectedBook.cover_image_url}`)
    : '/placeholder-cover.svg';

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
          <p style={{ color: 'var(--verso-danger)', fontWeight: 'bold' }}>{error}</p>
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

      {/* Simple View-Only Drawer for Members */}
      <Drawer
        isOpen={selectedBook !== null}
        onClose={() => setSelectedBook(null)}
        title="Book Specifications"
      >
        {selectedBook && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: 'calc(100% + 48px)',
              margin: '-24px -24px 10px -24px',
              aspectRatio: '16/9',
              background: 'var(--verso-bg)',
              overflow: 'hidden',
              borderBottom: '1px solid var(--verso-border)'
            }}>
              <img
                src={selectedCoverUrl}
                alt={selectedBook.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => e.target.src = '/placeholder-cover.svg'}
              />
            </div>
            
            <h3 style={{ fontFamily: 'Fraunces', fontSize: '22px', color: 'var(--verso-primary)', lineHeight: 1.3 }}>
              {selectedBook.title}
            </h3>
            <div style={{ fontFamily: 'Source Serif 4', fontSize: '15px', color: 'var(--verso-muted)' }}>
              by {selectedBook.author}
            </div>
            {selectedBook.genre && (
              <span style={{
                alignSelf: 'flex-start',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                backgroundColor: 'var(--verso-accent-light)',
                color: 'var(--verso-accent)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {selectedBook.genre}
              </span>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <div style={{ backgroundColor: 'var(--verso-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--verso-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--verso-muted)' }}>ISBN</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 500 }}>
                  {selectedBook.isbn || 'N/A'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--verso-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--verso-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--verso-muted)' }}>Stock Status</div>
                <div style={{ fontFamily: 'Source Serif 4', fontSize: '14px', fontWeight: 'bold', color: selectedBook.available_copies > 0 ? 'green' : 'red' }}>
                  {selectedBook.available_copies > 0 ? `${selectedBook.available_copies} Available` : 'Out of Stock'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
