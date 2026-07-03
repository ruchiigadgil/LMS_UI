// src/pages/member/ReviewsPage.jsx
import React, { useState, useEffect } from 'react';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getBooks, getReviews, addReview, deleteReview, getCurrentUser } from '../../api/api';
import { useToast } from '../../components/Toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import Icon from '../../components/Icon';
import { formatDate } from '../../utils/formatDate';
import styles from './ReviewsPage.module.css';

export default function ReviewsPage() {
  const setHeader = useMemberHeader();
  const toast = useToast();
  const user = getCurrentUser();

  const [books, setBooks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState('newest');

  // Form visibility
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setHeader({ title: 'Reviews', action: null });
  }, [setHeader]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getBooks().catch(() => []),
      getReviews().catch(() => [])
    ])
      .then(([booksData, reviewsData]) => {
        setBooks(booksData || []);
        setReviews(reviewsData || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedBookId) {
      toast.error('Please select a book to review');
      return;
    }
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!text.trim()) {
      toast.error('Please write your review');
      return;
    }

    setSubmitting(true);
    try {
      const review = await addReview({
        bookId: selectedBookId,
        rating,
        text: text.trim()
      });
      // Refetch — posting again for the same book updates the existing review
      const updated = await getReviews().catch(() => null);
      if (updated) {
        setReviews(updated);
      } else {
        setReviews(prev => [review, ...prev.filter(r => r.id !== review.id)]);
      }
      toast.success(review.updated ? 'Your review was updated' : 'Review posted');

      // Reset and close form
      setRating(0);
      setText('');
      setSelectedBookId(null);
      setShowForm(false);
    } catch (err) {
      toast.error(err.message || 'Failed to post review');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewId) {
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'rating-high':
        return b.rating - a.rating;
      case 'rating-low':
        return a.rating - b.rating;
      case 'book':
        return a.book_title.localeCompare(b.book_title);
      case 'newest':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  function renderStars(value) {
    return (
      <span className={styles.starRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <Icon
            key={i}
            name="star"
            className={`${styles.star} ${i <= value ? styles.starFilled : ''}`}
          />
        ))}
      </span>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header: title, sort, add review */}
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>All Reviews</h2>
        <div className={styles.headerActions}>
          {reviews.length > 1 && (
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="rating-high">Rating: High to Low</option>
              <option value="rating-low">Rating: Low to High</option>
              <option value="book">Book Title: A to Z</option>
            </select>
          )}
          {!showForm && (
            <button className={styles.addReviewBtn} onClick={() => setShowForm(true)}>
              <Icon name="plus" size={16} /> Add Review
            </button>
          )}
        </div>
      </div>

      {/* Write a Review (opens on Add Review) */}
      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Write a Review</h2>
            <button
              className={styles.formCloseBtn}
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Book</label>
              {books.length > 0 && (
                <SearchableDropdown
                  options={books}
                  placeholder="Search for a book..."
                  onSelect={(id) => setSelectedBookId(id)}
                  initialSelectedId={selectedBookId}
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Rating</label>
              <div
                className={styles.ratingPicker}
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    type="button"
                    className={styles.starBtn}
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHoverRating(i)}
                    aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
                  >
                    <Icon
                      name="star"
                      size={24}
                      className={`${styles.star} ${i <= (hoverRating || rating) ? styles.starFilled : ''}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Your Review</label>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="Share your thoughts about this book..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className={styles.listSection}>

        {loading ? (
          <div className={styles.loadingWrapper}>
            <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
            <p style={{ marginTop: '12px' }}>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.noResults}>
            No reviews yet. Be the first to share your thoughts on a book.
          </div>
        ) : (
          <div className={styles.reviewList}>
            {sortedReviews.map(review => (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewMeta}>
                    <span className={styles.reviewBook}>{review.book_title}</span>
                    {renderStars(review.rating)}
                  </div>
                  {user && review.user_id === user.id && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(review.id)}
                      aria-label="Delete review"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
                <p className={styles.reviewText}>{review.text}</p>
                <div className={styles.reviewFooter}>
                  <span className={styles.reviewAuthor}>{review.user_name}</span>
                  <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
