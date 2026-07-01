// src/components/ReturnSummaryModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getActiveLoans, returnLoan } from '../api/api';
import { useToast } from './Toast';
import Icon from './Icon';
import { formatDate } from '../utils/formatDate';
import styles from './ReturnSummaryModal.module.css';

export default function ReturnSummaryModal({ isOpen, onClose, bookId = null, loanId = null, onSuccess }) {
  const toast = useToast();
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Return Date: Today
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch loans if bookId is provided (we need to choose which loan to return)
  useEffect(() => {
    if (!isOpen) return;

    if (bookId) {
      setLoading(true);
      getActiveLoans()
        .then(loans => {
          const bookLoans = loans.filter(l => l.book_id === Number(bookId));
          setActiveLoans(bookLoans);
          if (bookLoans.length > 0) {
            setSelectedLoan(bookLoans[0]);
          } else {
            setSelectedLoan(null);
          }
        })
        .catch(err => toast.error(err.message || 'Failed to load active loans'))
        .finally(() => setLoading(false));
    } else if (loanId) {
      setLoading(true);
      getActiveLoans()
        .then(loans => {
          const match = loans.find(l => l.loan_id === Number(loanId));
          setSelectedLoan(match || null);
        })
        .catch(err => toast.error(err.message || 'Failed to load loan details'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, bookId, loanId, toast]);

  // Compute fine details
  let daysOverdue = 0;
  let fineAmount = 0;

  if (selectedLoan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(selectedLoan.due_date);
    const diffTime = today - dueDate;
    
    if (diffTime > 0) {
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Grace period = 2 days, Rate = ₹10/day
      if (daysOverdue > 2) {
        fineAmount = (daysOverdue - 2) * 10;
      }
    }
  }

  async function handleConfirm() {
    if (!selectedLoan) return;
    
    setSubmitting(true);
    try {
      const result = await returnLoan(selectedLoan.loan_id);
      
      // Main toast
      if (result.fine_amount > 0) {
        toast.success(`Book returned. Fine of ₹${result.fine_amount} raised.`);
      } else {
        toast.success('Book returned. No fine.');
      }

      // Secondary toast if reservation is ready
      if (result.reservation_msg) {
        toast.info(result.reservation_msg);
      } else if (result.message && result.message.includes('Reservation')) {
        toast.info(result.message);
      }

      if (onSuccess) {
        onSuccess(selectedLoan.book_id, selectedLoan.loan_id);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to return book');
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <div className={styles.modalFooter}>
      <button className={styles.btnCancel} onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      <button
        className={styles.btnSubmit}
        onClick={handleConfirm}
        disabled={!selectedLoan || submitting}
      >
        {submitting ? (
          <>
            <span className="spinner"></span> Processing...
          </>
        ) : (
          'Confirm Return'
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Return Book Summary"
      footer={footer}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <span className="spinner"></span> Loading loan details...
        </div>
      ) : (
        <>
          {bookId && activeLoans.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select loan to return</label>
              <select
                className={styles.select}
                value={selectedLoan ? selectedLoan.loan_id : ''}
                onChange={(e) => {
                  const match = activeLoans.find(l => l.loan_id === Number(e.target.value));
                  setSelectedLoan(match || null);
                }}
              >
                {activeLoans.map(l => (
                  <option key={l.loan_id} value={l.loan_id}>
                    {l.user_name} (Issued: {formatDate(l.issue_date)} • Due: {formatDate(l.due_date)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {bookId && activeLoans.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--verso-danger)' }}>
              No active loans found for this book.
            </div>
          )}

          {selectedLoan ? (
            <div className={styles.summary}>
              <div className={styles.row}>
                <span className={styles.key}>Borrower</span>
                <span className={styles.value}>{selectedLoan.user_name}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Book Title</span>
                <span className={styles.value}>{selectedLoan.book_title}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Issue Date</span>
                <span className={styles.value}>{formatDate(selectedLoan.issue_date)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Due Date</span>
                <span className={styles.value}>{formatDate(selectedLoan.due_date)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Return Date</span>
                <span className={styles.value}>{formatDate(todayStr)} (Today)</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--verso-border)' }} />
              <div className={styles.row}>
                <span className={styles.key}>Grace Period</span>
                <span className={styles.value}>2 Days</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Days Overdue</span>
                <span className={styles.value}>{daysOverdue} Day(s)</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Calculated Fine</span>
                <span className={`${styles.value} ${fineAmount > 0 ? styles.fineOverdue : ''}`}>
                  ₹{fineAmount.toFixed(2)}
                </span>
              </div>

              {daysOverdue > 0 && daysOverdue <= 2 && (
                <div className={styles.infoNote}>
                  <Icon name="info" className={styles.noteIcon} />
                  <span>Within 2-day grace period. No fine charged.</span>
                </div>
              )}
            </div>
          ) : (
            !bookId && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--verso-danger)' }}>
                Loan details could not be found.
              </div>
            )
          )}
        </>
      )}
    </Modal>
  );
}
