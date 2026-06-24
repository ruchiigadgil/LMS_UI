// src/pages/member/MyLoansPage.jsx
import React, { useState, useEffect } from 'react';
import { useMemberHeader } from '../../layouts/MemberShell';
import { getMemberLoans, getCurrentUser, renewLoan } from '../../api/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import styles from './MyLoansPage.module.css';

export default function MyLoansPage() {
  const setHeader = useMemberHeader();
  const toast = useToast();

  const [loans, setLoans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renewingId, setRenewingId] = useState(null);

  // Check waitlist reservations locally for tooltip display
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    setHeader({ title: 'My Loans', action: null });
  }, [setHeader]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    getMemberLoans(user.id)
      .then(data => {
        setLoans(data);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load your loans'))
      .finally(() => setLoading(false));

    // Load reservations from localStorage to determine if renewal is blocked
    const localRes = JSON.parse(localStorage.getItem('verso_reservations') || '[]');
    setReservations(localRes);
  }, []);

  async function handleRenew(loanId) {
    setRenewingId(loanId);
    try {
      const res = await renewLoan(loanId);
      toast.success(`Loan renewed. New due date: ${res.new_due_date}`);
      
      // Update local state directly
      setLoans(prev => prev.map(l => 
        l.loan_id === loanId 
          ? { ...l, renewal_count: (l.renewal_count || 0) + 1, due_date: res.new_due_date } 
          : l
      ));
    } catch (err) {
      toast.error(err.message || 'Failed to renew book');
    } finally {
      setRenewingId(null);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading your issued books...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : !loans || loans.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.noResults}>
            You do not have any active loans at this time.
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Book Title</th>
                  <th className={styles.th}>Issue Date</th>
                  <th className={styles.th}>Due Date</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Renewals Used</th>
                  <th className={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const dueDate = new Date(loan.due_date);
                  const isPastDue = today >= dueDate;

                  // Evaluate renewal viability
                  const isMaxRenewed = loan.renewal_count >= 2;
                  const hasWaitingList = reservations.some(r => r.book_id === loan.book_id && r.status === 'waiting');
                  
                  let buttonTooltip = '';
                  let isRenewDisabled = false;

                  if (isMaxRenewed) {
                    isRenewDisabled = true;
                    buttonTooltip = 'Max renewals reached (2/2)';
                  } else if (hasWaitingList) {
                    isRenewDisabled = true;
                    buttonTooltip = 'Cannot renew — someone is waiting for this book';
                  } else {
                    buttonTooltip = 'Renew for an additional 14 days';
                  }

                  return (
                    <tr key={loan.loan_id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.bookTitle}>{loan.book_title}</span>
                      </td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{loan.issue_date}</td>
                      <td className={`${styles.td} ${styles.dateVal} ${isPastDue ? styles.dueWarning : ''}`}>
                        {loan.due_date}
                      </td>
                      <td className={styles.td}>
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className={`${styles.td} ${styles.renewalsVal}`}>
                        {loan.renewal_count} / 2
                      </td>
                      <td className={styles.td}>
                        <div className={styles.tooltipWrapper} title={buttonTooltip}>
                          <button
                            className={styles.btnRenew}
                            onClick={() => handleRenew(loan.loan_id)}
                            disabled={isRenewDisabled || renewingId === loan.loan_id}
                          >
                              {renewingId === loan.loan_id ? 'Renewing...' : 'Renew'}
                          </button>
                        </div>
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
