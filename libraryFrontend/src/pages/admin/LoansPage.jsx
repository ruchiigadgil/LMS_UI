// src/pages/admin/LoansPage.jsx
import React, { useState, useEffect } from 'react';
import { useAdminHeader } from '../../layouts/AdminShell';
import { getActiveLoans, getOverdueLoans } from '../../api/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import ReturnSummaryModal from '../../components/ReturnSummaryModal';
import Icon from '../../components/Icon';
import { formatDate } from '../../utils/formatDate';
import styles from './LoansPage.module.css';

export default function LoansPage() {
  const setHeader = useAdminHeader();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'overdue'
  const [activeLoans, setActiveLoans] = useState(null);
  const [overdueLoans, setOverdueLoans] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Return dialog state
  const [selectedLoanId, setSelectedLoanId] = useState(null);

  useEffect(() => {
    setHeader({ title: '', action: null });
  }, [setHeader]);

  // Fetch loans based on tab
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (activeTab === 'active') {
      getActiveLoans()
        .then(data => {
          setActiveLoans(data);
          setError(null);
        })
        .catch(err => setError(err.message || 'Failed to fetch active loans'))
        .finally(() => setLoading(false));
    } else {
      getOverdueLoans()
        .then(data => {
          setOverdueLoans(data);
          setError(null);
        })
        .catch(err => setError(err.message || 'Failed to fetch overdue loans'))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  function handleReturnSuccess(bookId, loanId) {
    // Remove returned loan from both state caches
    if (activeLoans) {
      setActiveLoans(prev => prev.filter(l => l.loan_id !== loanId));
    }
    if (overdueLoans) {
      setOverdueLoans(prev => prev.filter(l => l.loan_id !== loanId));
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentList = activeTab === 'active' ? activeLoans : overdueLoans;

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Loans
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'overdue' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue Loans
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading loans...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--verso-danger)', fontWeight: 'bold' }}>{error}</p>
          <button
            onClick={() => {
              if (activeTab === 'active') setActiveLoans(null);
              else setOverdueLoans(null);
              setLoading(true);
            }}
            style={{ marginTop: '12px', textDecoration: 'underline' }}
          >
            Retry Loading
          </button>
        </div>
      ) : !currentList || currentList.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.noResults}>
            No {activeTab} loans found.
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Loan ID</th>
                  <th className={styles.th}>Member</th>
                  <th className={styles.th}>Book Title</th>
                  <th className={styles.th}>Issue Date</th>
                  <th className={styles.th}>Due Date</th>
                  {activeTab === 'overdue' && <th className={styles.th}>Days Overdue</th>}
                  <th className={styles.th}>Renewals</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map(loan => {
                  const dueDate = new Date(loan.due_date);
                  const isPastDue = today >= dueDate;
                  
                  return (
                    <tr key={loan.loan_id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.idVal}`}>{loan.loan_id}</td>
                      <td className={styles.td} style={{ fontWeight: 600 }}>{loan.user_name}</td>
                      <td className={styles.td}>{loan.book_title}</td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(loan.issue_date)}</td>
                      <td className={`${styles.td} ${styles.dateVal} ${isPastDue ? styles.dueWarning : ''}`}>
                        {formatDate(loan.due_date)}
                      </td>
                      {activeTab === 'overdue' && (
                        <td className={`${styles.td} ${styles.daysOverdue}`}>
                          {loan.days_overdue} Day(s)
                        </td>
                      )}
                      <td className={`${styles.td} ${styles.renewalsVal}`}>{loan.renewal_count} / 2</td>
                      <td className={styles.td}>
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className={styles.td}>
                        <button
                          className={styles.btnReturn}
                          onClick={() => setSelectedLoanId(loan.loan_id)}
                        >
                          <Icon name="return" className={styles.btnIcon} />
                          <span>Return</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Summary Modal */}
      <ReturnSummaryModal
        isOpen={selectedLoanId !== null}
        onClose={() => setSelectedLoanId(null)}
        loanId={selectedLoanId}
        onSuccess={handleReturnSuccess}
      />
    </div>
  );
}
