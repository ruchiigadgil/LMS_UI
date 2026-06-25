// src/components/BookCard.jsx
import React from 'react';
import styles from './BookCard.module.css';

export default function BookCard({ book, onClick }) {
  const coverUrl = book.cover_image_url
    ? (book.cover_image_url.startsWith('http') 
        ? book.cover_image_url 
        : `http://localhost:5005${book.cover_image_url}`)
    : '/placeholder-cover.svg';

  const isAvailable = book.available_copies > 0;

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.coverWrapper}>
        <img
          src={coverUrl}
          alt={book.title}
          className={styles.cover}
          onError={(e) => {
            e.target.src = '/placeholder-cover.svg';
          }}
        />
      </div>

      <div className={styles.info}>
        <h4 className={styles.title}>{book.title}</h4>
        <span className={styles.author}>by {book.author || 'Unknown'}</span>
        
        <div className={styles.meta}>
          {book.genre && <span>{book.genre}</span>}
          {book.isbn && <span>{book.isbn}</span>}
        </div>
      </div>
    </div>
  );
}
