// src/pages/admin/MemberDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminHeader } from '../../layouts/AdminShell';
import {
  getMembers,
  editMember,
  getActiveLoans,
  returnLoan,
  getAllReservations,
  addToWaitlist,
  getFines,
  payFine,
  getBooks,
  issueBook,
} from '../../api/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import SearchableDropdown from '../../components/SearchableDropdown';
import { formatDate } from '../../utils/formatDate';
import styles from './MemberDetailPage.module.css';

const MAX_BOOKS_PER_MEMBER = 5;

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const id = Number(memberId);
  const navigate = useNavigate();
  const setHeader = useAdminHeader();
  const toast = useToast();

  const [member, setMember] = useState(null);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [fines, setFines] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit form
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Issue / reserve dropdowns (key bump remounts them to clear selection)
  const [issueBookId, setIssueBookId] = useState(null);
  const [issueKey, setIssueKey] = useState(0);
  const [issuing, setIssuing] = useState(false);
  const [reserveBookId, setReserveBookId] = useState(null);
  const [reserveKey, setReserveKey] = useState(0);
  const [reserving, setReserving] = useState(false);
  const [busyLoanId, setBusyLoanId] = useState(null);
  const [busyFineId, setBusyFineId] = useState(null);

  useEffect(() => {
    setHeader({ title: '', action: null });
  }, [setHeader]);

  const loadMember = useCallback(async () => {
    const members = await getMembers();
    const m = members.find(x => x.id === id);
    if (!m) {
      setNotFound(true);
      return;
    }
    setMember(m);
    setForm(prev => prev || {
      name: m.name || '',
      email: m.email || '',
      phone: m.phone || '',
      membership_status: m.membership_status || 'active',
    });
  }, [id]);

  const loadLoans = useCallback(async () => {
    const all = await getActiveLoans();
    setLoans(all.filter(l => l.user_id === id));
  }, [id]);

  const loadReservations = useCallback(async () => {
    const all = await getAllReservations();
    setReservations(all.filter(r => r.user_id === id));
  }, [id]);

  const loadFines = useCallback(async () => {
    const all = await getFines();
    setFines(all.filter(f => f.user_id === id));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadMember(),
      loadLoans(),
      loadReservations(),
      loadFines(),
      getBooks().then(setBooks),
    ])
      .catch(() => toast.error('Failed to load member details'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      await editMember(id, form);
      toast.success('Member details updated');
      await loadMember();
    } catch (err) {
      toast.error(err.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  }

  async function handleIssue() {
    if (!issueBookId) {
      toast.error('Select a book to issue');
      return;
    }
    setIssuing(true);
    try {
      await issueBook({ user_id: id, book_id: issueBookId });
      toast.success('Book issued');
      setIssueBookId(null);
      setIssueKey(k => k + 1);
      await Promise.all([loadLoans(), getBooks().then(setBooks), loadMember()]);
    } catch (err) {
      toast.error(err.message || 'Failed to issue book');
    } finally {
      setIssuing(false);
    }
  }

  async function handleReturn(loanId) {
    setBusyLoanId(loanId);
    try {
      const result = await returnLoan(loanId);
      toast.success(
        result && result.fine_amount > 0
          ? `Book returned — $${Number(result.fine_amount).toFixed(2)} fine raised`
          : 'Book returned'
      );
      await Promise.all([loadLoans(), loadFines(), getBooks().then(setBooks), loadMember()]);
    } catch (err) {
      toast.error(err.message || 'Failed to return book');
    } finally {
      setBusyLoanId(null);
    }
  }

  async function handleReserve() {
    if (!reserveBookId) {
      toast.error('Select a book to reserve');
      return;
    }
    setReserving(true);
    try {
      const res = await addToWaitlist({ user_id: id, book_id: reserveBookId });
      toast.success(res.queue_position ? `Added to waitlist (position #${res.queue_position})` : 'Added to waitlist');
      setReserveBookId(null);
      setReserveKey(k => k + 1);
      await loadReservations();
    } catch (err) {
      toast.error(err.message || 'Failed to add reservation');
    } finally {
      setReserving(false);
    }
  }

  async function handlePayFine(fineId) {
    setBusyFineId(fineId);
    try {
      await payFine(fineId);
      toast.success('Fine marked as paid');
      await loadFines();
    } catch (err) {
      toast.error(err.message || 'Failed to mark fine as paid');
    } finally {
      setBusyFineId(null);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unpaidFines = fines.filter(f => !f.paid);
  const paidFines = fines.filter(f => f.paid);
  const atLoanLimit = loans.length >= MAX_BOOKS_PER_MEMBER;

  if (loading) {
    return (
      <div className={styles.stateMsg}>
        <span className="spinner"></span>
        <span>Loading member...</span>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className={styles.container}>
        <button className={styles.backLink} onClick={() => navigate('/admin/members')}>
          &larr; All Members
        </button>
        <div className={styles.stateMsg}>Member not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.backLink} onClick={() => navigate('/admin/members')}>
        &larr; All Members
      </button>

      {/* Header */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <h2 className={styles.memberName}>{member.name}</h2>
          <StatusBadge status={member.membership_status || 'ACTIVE'} />
        </div>
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Member ID</span>
            <span className={styles.metaValue}>{member.id}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Email</span>
            <span className={styles.metaValue}>{member.email}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Phone</span>
            <span className={styles.metaValue}>{member.phone || '—'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Joined</span>
            <span className={styles.metaValue}>{member.created_at ? formatDate(member.created_at) : '—'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Loans</span>
            <span className={styles.metaValue}>{loans.length} / {MAX_BOOKS_PER_MEMBER}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Unpaid Fines</span>
            <span className={styles.metaValue}>
              ${unpaidFines.reduce((s, f) => s + Number(f.amount || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Edit details — full-width, fields inline */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Edit Details</h3>
        <form onSubmit={handleSave} className={styles.inlineForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address *</label>
            <input
              type="email"
              className={styles.input}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input
              type="tel"
              className={styles.input}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Membership Status</label>
            <select
              className={styles.select}
              value={form.membership_status}
              onChange={(e) => setForm({ ...form, membership_status: e.target.value })}
              disabled={saving}
            >
              <option value="active">ACTIVE</option>
              <option value="suspended">SUSPENDED</option>
              <option value="expired">EXPIRED</option>
            </select>
          </div>
          <button type="submit" className={`${styles.primaryBtn} ${styles.formBtn}`} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Issue + reserve, side by side */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Issue a Book</h3>
          <div className={styles.actionRow}>
            <div className={styles.dropdownWrap}>
              <SearchableDropdown
                key={issueKey}
                options={books.filter(b => b.available_copies > 0)}
                placeholder="Search for an available book..."
                onSelect={setIssueBookId}
              />
            </div>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleIssue}
              disabled={issuing || atLoanLimit || !issueBookId}
            >
              {issuing ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
          {atLoanLimit && (
            <p className={styles.hintText}>
              This member has reached the {MAX_BOOKS_PER_MEMBER}-loan limit — return a book first.
            </p>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Add a Reservation</h3>
          <div className={styles.actionRow}>
            <div className={styles.dropdownWrap}>
              <SearchableDropdown
                key={`r-${reserveKey}`}
                options={books}
                placeholder="Search for a book to reserve..."
                onSelect={setReserveBookId}
              />
            </div>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleReserve}
              disabled={reserving || !reserveBookId}
            >
              {reserving ? 'Adding...' : 'Reserve'}
            </button>
          </div>
        </div>
      </div>

      {/* Current loans */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Current Loans ({loans.length})</h3>
        {loans.length === 0 ? (
          <p className={styles.emptyText}>No books currently on loan.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Book</th>
                  <th className={styles.th}>Issued</th>
                  <th className={styles.th}>Due</th>
                  <th className={styles.th}>Renewals</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const isPastDue = today > new Date(loan.due_date);
                  return (
                    <tr key={loan.loan_id} className={styles.tr}>
                      <td className={styles.td}>{loan.book_title}</td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(loan.issue_date)}</td>
                      <td className={`${styles.td} ${styles.dateVal} ${isPastDue ? styles.dueWarning : ''}`}>
                        {formatDate(loan.due_date)}
                      </td>
                      <td className={styles.td}>{loan.renewal_count} / 2</td>
                      <td className={styles.td}>
                        <StatusBadge status={isPastDue ? 'OVERDUE' : 'ACTIVE'} />
                      </td>
                      <td className={`${styles.td} ${styles.tdAction}`}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => handleReturn(loan.loan_id)}
                          disabled={busyLoanId === loan.loan_id}
                        >
                          {busyLoanId === loan.loan_id ? 'Returning...' : 'Mark Returned'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reservations */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Reservations ({reservations.length})</h3>
        {reservations.length === 0 ? (
          <p className={styles.emptyText}>No active reservations.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Book</th>
                  <th className={styles.th}>Rank</th>
                  <th className={styles.th}>Requested</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.reservation_id} className={styles.tr}>
                    <td className={styles.td}>{r.book_title}</td>
                    <td className={styles.td}>#{r.queue_position}</td>
                    <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(r.requested_at)}</td>
                    <td className={styles.td}>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fines */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Fines ({fines.length})</h3>
        {fines.length === 0 ? (
          <p className={styles.emptyText}>No fines on record.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Book</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {unpaidFines.map(f => (
                  <tr key={f.id} className={styles.tr}>
                    <td className={styles.td}>{f.book_title}</td>
                    <td className={`${styles.td} ${styles.fineAmount}`}>${Number(f.amount).toFixed(2)}</td>
                    <td className={styles.td}>
                      <StatusBadge status="UNPAID" />
                    </td>
                    <td className={`${styles.td} ${styles.tdAction}`}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => handlePayFine(f.id)}
                        disabled={busyFineId === f.id}
                      >
                        {busyFineId === f.id ? 'Saving...' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                ))}
                {paidFines.map(f => (
                  <tr key={f.id} className={`${styles.tr} ${styles.rowMuted}`}>
                    <td className={styles.td}>{f.book_title}</td>
                    <td className={styles.td}>${Number(f.amount).toFixed(2)}</td>
                    <td className={styles.td}>
                      <StatusBadge status="PAID" />
                    </td>
                    <td className={`${styles.td} ${styles.tdAction} ${styles.dateVal}`}>
                      {f.paid_at ? `paid ${formatDate(f.paid_at)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
