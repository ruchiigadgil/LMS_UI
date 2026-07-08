// src/components/MemberDetailModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { formatDate } from '../utils/formatDate';
import { getMemberLoans, getMemberFines, getMemberReservations } from '../api/api';
import styles from './MemberDetailModal.module.css';

export default function MemberDetailModal({ member, isOpen, onClose }) {
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !member) return;

    setLoading(true);
    Promise.all([
      getMemberLoans(member.id).catch(() => []),
      getMemberFines(member.id).catch(() => []),
      getMemberReservations(member.id).catch(() => [])
    ])
      .then(([loansData, finesData, reservationsData]) => {
        setLoans(loansData || []);
        setFines(finesData || []);
        setReservations(reservationsData || []);
      })
      .finally(() => setLoading(false));
  }, [isOpen, member]);

  if (!member) return null;

  const activeLoans = loans.filter(l => l.status === 'active');
  const unpaidFines = fines.filter(f => !f.paid);
  const activeReservations = reservations.filter(r => r.status === 'waiting' || r.status === 'ready');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Member Details" size="wide">
      <div className={styles.container}>
        {/* Member Info Header */}
        <div className={styles.header}>
          <div className={styles.info}>
            <h2 className={styles.name}>{member.name}</h2>
            <p className={styles.email}>{member.email}</p>
            {member.phone && <p className={styles.phone}>{member.phone}</p>}
          </div>
          <StatusBadge status={member.membership_status || 'ACTIVE'} />
        </div>

        {/* Member Since */}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Member Since</span>
          <span className={styles.metaValue}>
            {member.created_at ? formatDate(member.created_at) : 'N/A'}
          </span>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <span className="spinner"></span>
            <span>Loading member activity...</span>
          </div>
        ) : (
          <>
            {/* Active Loans Section */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Active Loans</h3>
                <span className={styles.sectionCount}>{activeLoans.length}</span>
              </div>
              {activeLoans.length === 0 ? (
                <p className={styles.emptyText}>No active loans</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLoans.map(loan => {
                        const dueDate = new Date(loan.due_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isOverdue = today > dueDate;

                        return (
                          <tr key={loan.loan_id}>
                            <td data-label="Book">{loan.book_title}</td>
                            <td data-label="Issued">{formatDate(loan.issue_date)}</td>
                            <td className={isOverdue ? styles.overdue : ''} data-label="Due">
                              {formatDate(loan.due_date)}
                            </td>
                            <td data-label="Status">
                              <StatusBadge status={isOverdue ? 'OVERDUE' : 'ACTIVE'} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Reservations / Waitlist Section */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Reservations</h3>
                <span className={styles.sectionCount}>{activeReservations.length}</span>
              </div>
              {activeReservations.length === 0 ? (
                <p className={styles.emptyText}>No active reservations</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Requested On</th>
                        <th>Queue Position</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReservations.map(res => (
                        <tr key={res.reservation_id}>
                          <td data-label="Book">{res.book_title}</td>
                          <td data-label="Requested">{formatDate(res.requested_at)}</td>
                          <td data-label="Queue">{res.queue_position}</td>
                          <td data-label="Status">
                            <StatusBadge status={res.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Fines Section */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Unpaid Fines</h3>
                <span className={styles.sectionCount}>{unpaidFines.length}</span>
              </div>
              {unpaidFines.length === 0 ? (
                <p className={styles.emptyText}>No unpaid fines</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Amount</th>
                        <th>Raised On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidFines.map(fine => (
                        <tr key={fine.id}>
                          <td data-label="Book">{fine.book_title}</td>
                          <td className={styles.fineAmount} data-label="Amount">{fine.amount.toFixed(2)}</td>
                          <td data-label="Raised">{formatDate(fine.raised_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {unpaidFines.length > 0 && (
                <div className={styles.totalFine}>
                  Total Outstanding: {unpaidFines.reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
