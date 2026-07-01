// src/pages/member/HoldsPage.jsx
import React, { useState, useEffect } from 'react';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getMemberReservations, getCurrentUser } from '../../api/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import styles from './HoldsPage.module.css';

export default function HoldsPage() {
  const setHeader = useMemberHeader();
  const [reservations, setReservations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHeader({ title: 'My Reservations', action: null });
  }, [setHeader]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    getMemberReservations(user.id)
      .then(data => {
        setReservations(data);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load reservations'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading your reservations...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.noResults}>
            You do not have any active reservations at this time.
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Book Title</th>
                  <th className={styles.th}>Author</th>
                  <th className={styles.th}>Requested On</th>
                  <th className={styles.th}>Queue Position</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(reservation => (
                    <tr key={reservation.reservation_id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.bookTitle}>{reservation.book_title}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.authorName}>{reservation.book_author}</span>
                      </td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(reservation.requested_at)}</td>
                      <td className={styles.td}>
                        <div className={styles.queueBadge}>
                          <span className={`${styles.queueNumber} ${reservation.queue_position === 1 ? styles.queueFirst : ''}`}>
                            #{reservation.queue_position}
                          </span>
                          {reservation.queue_position === 1 && (
                            <span className={styles.queueLabel}>You're next!</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <StatusBadge status={reservation.status} />
                      </td>
                    </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
