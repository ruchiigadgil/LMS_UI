// src/pages/member/MyFinesPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getMemberFines, getMemberLoans, getCurrentUser, payFine } from '../../api/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import styles from './MyFinesPage.module.css';

export default function MyFinesPage() {
  const setHeader = useMemberHeader();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [fines, setFines] = useState(null);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);

  // Highlight unpaid fines when arriving from a notification
  const [highlightUnpaid, setHighlightUnpaid] = useState(searchParams.get('highlight') === 'unpaid');

  useEffect(() => {
    if (!highlightUnpaid) return;
    const timer = setTimeout(() => setHighlightUnpaid(false), 5000);
    return () => clearTimeout(timer);
  }, [highlightUnpaid]);

  useEffect(() => {
    setHeader({ title: 'My Fines', action: null });
  }, [setHeader]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);

    Promise.all([
      getMemberFines(user.id),
      getMemberLoans(user.id)
    ])
      .then(([finesData, loansData]) => {
        setFines(finesData);

        // Filter overdue loans
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = loansData.filter(loan => {
          const dueDate = new Date(loan.due_date);
          return today > dueDate;
        }).map(loan => {
          const dueDate = new Date(loan.due_date);
          const diffTime = Math.abs(today - dueDate);
          const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          // Grace period = 2 days, Rate = ₹10/day
          const estimatedFine = daysOverdue > 2 ? (daysOverdue - 2) * 10 : 0;
          return { ...loan, daysOverdue, estimatedFine };
        });
        setOverdueLoans(overdue);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load fines'))
      .finally(() => setLoading(false));
  }, []);

  async function handlePayFine(fineId) {
    setPayingId(fineId);
    try {
      await payFine(fineId);
      toast.success('Fine paid successfully');
      setFines(prev => prev.map(f =>
        f.id === fineId ? { ...f, paid: true, paid_at: new Date().toISOString() } : f
      ));
    } catch (err) {
      toast.error(err.message || 'Failed to pay fine');
    } finally {
      setPayingId(null);
    }
  }

  const unpaidFines = fines?.filter(f => !f.paid) || [];
  const paidFines = fines?.filter(f => f.paid) || [];

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
      ) : (
        <>
          {/* Overdue Books Section */}
          {overdueLoans.length > 0 && (
            <div className={styles.section}>
              {/* <h2 className={styles.sectionTitle}>Overdue Books</h2>
              <p className={styles.sectionSubtitle}>Return these books to avoid additional fines</p> */}
              <div className={styles.tableCard}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Book Title</th>
                        <th className={styles.th}>Due Date</th>
                        <th className={styles.th}>Days Overdue</th>
                        <th className={styles.th}>Estimated Fine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueLoans.map(loan => (
                        <tr key={loan.loan_id} className={`${styles.tr} ${styles.overdueRow}`}>
                          <td className={styles.td}>
                            <span className={styles.bookTitle}>{loan.book_title}</span>
                          </td>
                          <td className={`${styles.td} ${styles.dateVal} ${styles.overdueDateVal}`}>
                            {formatDate(loan.due_date)}
                          </td>
                          <td className={styles.td}>
                            <span className={styles.daysOverdue}>{loan.daysOverdue} days</span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.estimatedFine}>
                              {loan.estimatedFine > 0 ? `₹${loan.estimatedFine.toFixed(2)}` : 'Within grace period'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Unpaid Fines Section */}
          {unpaidFines.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Unpaid Fines</h2>
              <div className={styles.tableCard}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Book Title</th>
                        <th className={styles.th}>Amount</th>
                        <th className={styles.th}>Raised On</th>
                        <th className={styles.th}>Status</th>
                        <th className={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidFines.map(fine => (
                          <tr key={fine.id} className={`${styles.tr} ${highlightUnpaid ? styles.highlightRow : ''}`}>
                            <td className={styles.td}>
                              <span className={styles.bookTitle}>{fine.book_title}</span>
                            </td>
                            <td className={`${styles.td} ${styles.amountVal} ${styles.amountUnpaid}`}>
                              ₹{fine.amount.toFixed(2)}
                            </td>
                            <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(fine.raised_at)}</td>
                            <td className={styles.td}>
                              <StatusBadge status="UNPAID" />
                            </td>
                            <td className={styles.td}>
                              <button
                                className={styles.btnPay}
                                onClick={() => handlePayFine(fine.id)}
                                disabled={payingId === fine.id}
                              >
                                {payingId === fine.id ? 'Processing...' : 'Pay Fine'}
                              </button>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Paid Fines Section */}
          {paidFines.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Payment History</h2>
              <div className={styles.tableCard}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Book Title</th>
                        <th className={styles.th}>Amount</th>
                        <th className={styles.th}>Raised On</th>
                        <th className={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidFines.map(fine => (
                          <tr key={fine.id} className={styles.tr}>
                            <td className={styles.td}>
                              <span className={styles.bookTitle}>{fine.book_title}</span>
                            </td>
                            <td className={`${styles.td} ${styles.amountVal} ${styles.amountPaid}`}>
                              ₹{fine.amount.toFixed(2)}
                            </td>
                            <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(fine.raised_at)}</td>
                            <td className={styles.td}>
                              <StatusBadge status="PAID" />
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* No fines message */}
          {unpaidFines.length === 0 && paidFines.length === 0 && overdueLoans.length === 0 && (
            <div className={styles.tableCard}>
              <div className={styles.noResults}>
                You have no outstanding or past fines.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
