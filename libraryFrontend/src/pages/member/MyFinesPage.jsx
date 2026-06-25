// src/pages/member/MyFinesPage.jsx
import React, { useState, useEffect } from 'react';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getMemberFines, getCurrentUser } from '../../api/api';
import StatusBadge from '../../components/StatusBadge';
import styles from './MyFinesPage.module.css';

export default function MyFinesPage() {
  const setHeader = useMemberHeader();
  const [fines, setFines] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHeader({ title: 'My Fines', action: null });
  }, [setHeader]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    getMemberFines(user.id)
      .then(data => {
        setFines(data);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load fines'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading fine records...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--verso-danger)', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : !fines || fines.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.noResults}>
            You have no outstanding or past fines.
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Book Title</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Raised At</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fines.map(fine => {
                  const raisedDate = new Date(fine.raised_at).toLocaleDateString();
                  
                  return (
                    <tr key={fine.id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.bookTitle}>{fine.book_title}</span>
                      </td>
                      <td className={`${styles.td} ${styles.amountVal} ${fine.paid ? styles.amountPaid : styles.amountUnpaid}`}>
                        ₹{fine.amount.toFixed(2)}
                      </td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{raisedDate}</td>
                      <td className={styles.td}>
                        <StatusBadge status={fine.paid ? 'PAID' : 'UNPAID'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
