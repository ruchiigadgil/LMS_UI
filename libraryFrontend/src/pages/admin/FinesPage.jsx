// src/pages/admin/FinesPage.jsx
import React, { useState, useEffect } from 'react';
import { useAdminHeader } from '../../layouts/AdminShell';
import { getFines, payFine } from '../../api/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import styles from './FinesPage.module.css';

export default function FinesPage() {
  const setHeader = useAdminHeader();
  const toast = useToast();

  const [fines, setFines] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    setHeader({ title: 'Fines & Penalties', action: null });
  }, [setHeader]);

  useEffect(() => {
    setLoading(true);
    getFines()
      .then(data => {
        setFines(data);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load fines list'))
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkPaid(fineId) {
    setSubmittingId(fineId);
    try {
      await payFine(fineId);
      toast.success('Fine marked as paid successfully');
      
      // Update local state directly
      setFines(prev => prev.map(f => 
        f.id === fineId 
          ? { ...f, paid: true, paid_at: new Date().toISOString() } 
          : f
      ));
    } catch (err) {
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setSubmittingId(null);
    }
  }

  // Filter fines client-side
  const filteredFines = (fines || []).filter(fine => {
    if (filter === 'unpaid') return !fine.paid;
    if (filter === 'paid') return fine.paid;
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All Fines
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'unpaid' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('unpaid')}
        >
          Unpaid
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'paid' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('paid')}
        >
          Paid
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading fine records...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--verso-danger)', fontWeight: 'bold' }}>{error}</p>
          <button
            onClick={() => {
              setFines(null);
              setLoading(true);
            }}
            style={{ marginTop: '12px', textDecoration: 'underline' }}
          >
            Retry Loading
          </button>
        </div>
      ) : filteredFines.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.noResults}>
            No {filter !== 'all' ? filter : ''} fines recorded.
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Fine ID</th>
                  <th className={styles.th}>Member</th>
                  <th className={styles.th}>Book Title</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Raised At</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFines.map(fine => {
                  const raisedDate = new Date(fine.raised_at).toLocaleDateString();
                  
                  return (
                    <tr key={fine.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.idVal}`}>{fine.id}</td>
                      <td className={styles.td} style={{ fontWeight: 600 }}>{fine.user_name}</td>
                      <td className={styles.td}>{fine.book_title}</td>
                      <td className={`${styles.td} ${styles.amountVal} ${fine.paid ? styles.amountPaid : styles.amountUnpaid}`}>
                        ₹{fine.amount.toFixed(2)}
                      </td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{raisedDate}</td>
                      <td className={styles.td}>
                        <StatusBadge status={fine.paid ? 'PAID' : 'UNPAID'} />
                      </td>
                      <td className={styles.td}>
                        {!fine.paid ? (
                          <button
                            className={styles.btnPay}
                            onClick={() => handleMarkPaid(fine.id)}
                            disabled={submittingId === fine.id}
                          >
                            {submittingId === fine.id ? 'Processing...' : 'Mark Paid'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--verso-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                            Settled
                          </span>
                        )}
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
