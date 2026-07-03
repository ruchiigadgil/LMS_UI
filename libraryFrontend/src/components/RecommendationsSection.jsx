// src/components/RecommendationsSection.jsx
import React, { useState, useEffect } from 'react';
import { getRecommendations, getCurrentUser } from '../api/api';
import BookShelf from './BookShelf';
import styles from './RecommendationsSection.module.css';

export default function RecommendationsSection({ onBookClick }) {
  const [mightLike, setMightLike] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    getRecommendations(user.id)
      .then(data => setMightLike((data.might_like || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || mightLike.length === 0) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Books You Might Like</h2>
      <BookShelf books={mightLike} onBookClick={onBookClick} />
    </div>
  );
}
