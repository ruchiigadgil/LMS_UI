// src/components/BookOnShelf.jsx
import React from 'react';
import styles from './BookOnShelf.module.css';

export default function BookOnShelf({ book, onClick }) {
  const coverUrl = book.cover_image_url || '/placeholder-cover.svg';

  const isAvailable = book.available_copies > 0;

  return (
    <div
      className={styles.book}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${book.title} by ${book.author || 'Unknown'}`}
    >
      <div className={styles.spine}>
        <img
          src={coverUrl}
          alt={book.title}
          className={styles.cover}
          onError={(e) => {
            e.target.src = '/placeholder-cover.svg';
          }}
        />
        <div className={styles.spineOverlay}>
          <span className={styles.spineTitle}>{book.title}</span>
        </div>
      </div>
      {!isAvailable && (
        <div className={styles.unavailableBadge}>Borrowed</div>
      )}
      {book.avg_rating != null && (
        <div className={styles.ratingBadge}>
          <span className={styles.ratingStar}>★</span> {book.avg_rating}
        </div>
      )}
    </div>
  );
}
