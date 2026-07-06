// src/components/BookCard.jsx
import React from 'react';
import styles from './BookCard.module.css';

export default function BookCard({ book, onClick, disableClick = false, isAdmin = false, noCoverText = false }) {
  const hasCover = !!book.cover_image_url;
  const coverUrl = hasCover
    ? (book.cover_image_url.startsWith('http')
        ? book.cover_image_url
        : `http://localhost:5005${book.cover_image_url}`)
    : '/placeholder-cover.svg';

  const isAvailable = book.available_copies > 0;
  const isOutOfStock = book.available_copies === 0;

  return (
    <div
      className={`${styles.card} ${disableClick ? styles.noClick : ''}`}
      onClick={disableClick ? undefined : onClick}
      role={disableClick ? undefined : "button"}
      tabIndex={disableClick ? undefined : 0}
    >
      <div className={styles.coverWrapper}>
        {!hasCover && noCoverText ? (
          <div className={styles.noCoverPlaceholder}>No cover uploaded</div>
        ) : (
          <img
            src={coverUrl}
            alt={book.title}
            className={styles.cover}
            onError={(e) => {
              e.target.src = '/placeholder-cover.svg';
            }}
          />
        )}
        {isAdmin && (
          <div className={`${styles.stockBadge} ${isOutOfStock ? styles.outOfStock : ''}`}>
            {isOutOfStock
              ? 'Out of Stock'
              : `${book.available_copies}/${book.total_copies}`}
          </div>
        )}
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
