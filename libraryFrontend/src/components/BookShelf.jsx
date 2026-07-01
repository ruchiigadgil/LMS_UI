// src/components/BookShelf.jsx
import React from 'react';
import BookOnShelf from './BookOnShelf';
import styles from './BookShelf.module.css';

export default function BookShelf({ books, onBookClick }) {
  return (
    <div className={styles.shelfContainer}>
      <div className={styles.booksRow}>
        {books.map(book => (
          <BookOnShelf
            key={book.id}
            book={book}
            onClick={() => onBookClick(book)}
          />
        ))}
      </div>
      <img
        src="/Shelf.png"
        alt="Wooden shelf"
        className={styles.shelfImage}
      />
    </div>
  );
}
