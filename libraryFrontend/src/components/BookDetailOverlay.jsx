// src/components/BookDetailOverlay.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { MembersContext } from './MembersContext';
import { useToast } from './Toast';
import Icon from './Icon';
import SearchableDropdown from './SearchableDropdown';
import {
  issueBook,
  editBook,
  deleteBook,
  getActiveLoans,
  returnLoan,
  getBooks,
  getMembers,
  addMember
} from '../api/api';
import BookCard from './BookCard';
import styles from './BookDetailOverlay.module.css';

export default function BookDetailOverlay({ book, onClose, onUpdate, onDelete, isAdmin }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { members, setMembers, load: loadMembers } = useContext(MembersContext);

  // Sub-view: null = normal view, 'issue' | 'return' | 'edit'
  const [activeSubView, setActiveSubView] = useState(null);

  // ---- Issue form state ----
  const [issueMemberId, setIssueMemberId] = useState('');
  const [issueSuccessMsg, setIssueSuccessMsg] = useState('');
  const [issueErrorMsg, setIssueErrorMsg] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' });
  const [addMemberSuccess, setAddMemberSuccess] = useState('');
  const [addMemberError, setAddMemberError] = useState('');

  // ---- Return form state ----
  const [bookActiveLoans, setBookActiveLoans] = useState([]);
  const [selectedReturnLoan, setSelectedReturnLoan] = useState(null);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState('');
  const [reservationBanner, setReservationBanner] = useState('');

  // ---- Edit form state ----
  const [editForm, setEditForm] = useState({
    title: '', author: '', genre: '', isbn: '',
    total_copies: 1, cover_image_url: ''
  });

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Shared loading state
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // ---- Load members when issue view opens ----
  useEffect(() => {
    if (!book) return;

    if (activeSubView === 'issue') {
      setIssueMemberId('');
      setIssueSuccessMsg('');
      setIssueErrorMsg('');
      setReturnSuccessMsg('');
      setReservationBanner('');
      setAddMemberOpen(false);
      setNewMember({ name: '', email: '', phone: '' });
      setAddMemberSuccess('');
      setAddMemberError('');
      // Fetch members for searchable dropdown
      getMembers().then(setAllMembers).catch(() => setAllMembers([]));
    }

    if (activeSubView === 'return') {
      setSelectedReturnLoan(null);
      setReturnSuccessMsg('');
      setReservationBanner('');
      setLoading(true);
      getActiveLoans()
        .then(loans => {
          const filtered = loans.filter(l => l.book_id === book.id);
          setBookActiveLoans(filtered);
          if (filtered.length > 0) setSelectedReturnLoan(filtered[0]);
        })
        .catch(err => toast.error('Failed to load active loans for this book'))
        .finally(() => setLoading(false));
    }

    if (activeSubView === 'edit') {
      setEditForm({
        title: book.title || '',
        author: book.author || '',
        genre: book.genre || '',
        isbn: book.isbn || '',
        total_copies: book.total_copies || 1,
        cover_image_url: book.cover_image_url || ''
      });
    }
  }, [activeSubView, book]);

  // Reset sub-view when book changes
  useEffect(() => {
    if (book) {
      setActiveSubView(null);
      setReturnSuccessMsg('');
      setReservationBanner('');
    }
  }, [book]);

  if (!book) return null;

  const isAvailable = book.available_copies > 0;

  // ============================================================
  // HANDLERS
  // ============================================================

  async function handleIssueSubmit(e) {
    e.preventDefault();
    if (!issueMemberId) { toast.error('Please select a member'); return; }
    setLoading(true);
    setIssueSuccessMsg('');
    setIssueErrorMsg('');
    try {
      await issueBook({ user_id: Number(issueMemberId), book_id: book.id });
      setIssueSuccessMsg('Book issued successfully');
      setIssueMemberId('');
      setTimeout(async () => {
        try {
          const allBooks = await getBooks();
          const updated = allBooks.find(b => b.id === book.id);
          if (updated) onUpdate(updated);
          setActiveSubView(null);
        } catch {
          setActiveSubView(null);
        }
      }, 1500);
    } catch (err) {
      setIssueErrorMsg(err.message || 'Failed to issue book');
    } finally { setLoading(false); }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!newMember.name || !newMember.email) {
      setAddMemberError('Name and email are required');
      return;
    }
    setLoading(true);
    setAddMemberError('');
    setAddMemberSuccess('');
    try {
      await addMember(newMember);
      setAddMemberSuccess('Member added successfully');
      setNewMember({ name: '', email: '', phone: '' });
      setAddMemberOpen(false);
      // Refresh member list
      const refreshed = await getMembers();
      setAllMembers(refreshed);
      toast.success('Member added');
    } catch (err) {
      setAddMemberError(err.message || 'Failed to add member');
    } finally { setLoading(false); }
  }

  async function handleReturnConfirm(e) {
    e.preventDefault();
    if (!selectedReturnLoan) return;
    setLoading(true);
    setReturnSuccessMsg('');
    setReservationBanner('');
    try {
      const result = await returnLoan(selectedReturnLoan.loan_id);
      let successText = 'Book returned successfully';
      if (result.fine_amount > 0) successText = `Book returned. Fine of ₹${result.fine_amount} raised.`;
      else if (result.message && result.message.includes('No fine')) successText = 'Book returned. No fine.';
      setReturnSuccessMsg(successText);

      if (result.reservation_msg) {
        setReservationBanner(result.reservation_msg);
      } else if (result.message && result.message.includes('Reservation')) {
        setReservationBanner(result.message);
      }

      if (onUpdate) onUpdate({ ...book, available_copies: book.available_copies + 1 });

      setTimeout(async () => {
        try {
          const allBooks = await getBooks();
          const updated = allBooks.find(b => b.id === book.id);
          if (updated) onUpdate(updated);
        } catch { /* optimistic update already applied */ }
        setActiveSubView(null);
        setReturnSuccessMsg('');
        setReservationBanner('');
      }, 2000);
    } catch (err) {
      setReturnSuccessMsg(err.message || 'Return failed');
    } finally { setLoading(false); }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await editBook(book.id, editForm);
      toast.success('Book details updated');
      if (onUpdate) onUpdate({ ...book, ...editForm });
      setActiveSubView(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update book');
    } finally { setLoading(false); }
  }

  async function handleDeleteConfirm() {
    setLoading(true);
    try {
      await deleteBook(book.id);
      toast.success('Book deleted');
      onDelete(book.id);
    } catch (err) {
      toast.error(err.message || 'Failed to delete book');
    } finally { setLoading(false); }
  }

  // Calculate fine for return form
  let returnDaysOverdue = 0, returnFine = 0;
  if (selectedReturnLoan) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(selectedReturnLoan.due_date);
    const diff = today - dueDate;
    if (diff > 0) {
      returnDaysOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (returnDaysOverdue > 2) {
        returnFine = Math.min((returnDaysOverdue - 2) * 10, 500);
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function goBack() {
    setActiveSubView(null);
    setReturnSuccessMsg('');
    setIssueSuccessMsg('');
    setIssueErrorMsg('');
    setAddMemberOpen(false);
    setAddMemberSuccess('');
    setAddMemberError('');
  }

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const memberOptions = allMembers.map(m => ({
    value: m.id,
    label: m.name || `Member #${m.id}`,
    sublabel: `${m.email} — ID: ${m.id}`
  }));

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>

        <div className={styles.body}>

          {/* ======================================================== */}
          {/* LEFT COLUMN — always book cover (top) + details (bottom) */}
          {/* ======================================================== */}
          <div className={styles.left}>
            <BookCard book={book} />
            <div className={styles.leftDetails}>
              <h3 className={styles.leftTitle}>{book.title}</h3>
              <div className={styles.leftAuthor}>by {book.author || 'Unknown'}</div>
              {book.genre && <span className={styles.leftGenre}>{book.genre}</span>}
              <div className={styles.leftMeta}>
                <div className={styles.leftMetaRow}>
                  <span className={styles.leftMetaLabel}>ISBN</span>
                  <span className={styles.leftMetaVal}>{book.isbn || 'N/A'}</span>
                </div>
                <div className={styles.leftMetaRow}>
                  <span className={styles.leftMetaLabel}>Copies</span>
                  <span className={styles.leftMetaVal}>{book.total_copies}</span>
                </div>
                <div className={styles.leftMetaRow}>
                  <span className={styles.leftMetaLabel}>Available</span>
                  <span className={`${styles.leftMetaVal} ${isAvailable ? styles.metaAvailable : styles.metaUnavailable}`}>
                    {book.available_copies}
                  </span>
                </div>
                <div className={styles.leftMetaRow}>
                  <span className={styles.leftMetaLabel}>Status</span>
                  <span className={`${styles.leftMetaVal} ${isAvailable ? styles.metaAvailable : styles.metaUnavailable}`}>
                    {isAvailable ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN — normal view or form                     */}
          {/* ======================================================== */}
          <div className={styles.right}>
            {/* ---- Normal view: specs + action buttons ---- */}
            {!activeSubView && isAdmin && (
              <>
                <span className={styles.panelTitle}>Specifications</span>
                <div className={styles.actionGrid}>
                  {isAvailable ? (
                    <button className={`${styles.btnAction} ${styles.btnIssue}`} onClick={() => setActiveSubView('issue')}>
                      <Icon name="book" className={styles.btnIcon} />
                      <span>Issue Book</span>
                    </button>
                  ) : (
                    <button className={`${styles.btnAction} ${styles.btnIssue}`} disabled>
                      <Icon name="book" className={styles.btnIcon} />
                      <span>Issue Book</span>
                    </button>
                  )}
                  <button className={`${styles.btnAction} ${styles.btnReturn}`} onClick={() => setActiveSubView('return')}>
                    <Icon name="return" className={styles.btnIcon} />
                    <span>Mark Returned</span>
                  </button>
                  <button className={`${styles.btnAction} ${styles.btnEdit}`} onClick={() => setActiveSubView('edit')}>
                    <Icon name="edit" className={styles.btnIcon} />
                    <span>Edit Details</span>
                  </button>
                  <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => setShowDeleteConfirm(true)}>
                    <Icon name="trash" className={styles.btnIcon} />
                    <span>Delete Book</span>
                  </button>
                </div>
              </>
            )}

            {/* ---- Normal view: non-admin sees only specs ---- */}
            {!activeSubView && !isAdmin && (
              <>
                <span className={styles.panelTitle}>Specifications</span>
                <div className={styles.metaGrid}>
                  <div className={styles.metaBox}>
                    <span className={styles.metaLabel}>ISBN</span>
                    <span className={styles.metaValue}>{book.isbn || 'N/A'}</span>
                  </div>
                  <div className={styles.metaBox}>
                    <span className={styles.metaLabel}>Total Copies</span>
                    <span className={styles.metaValue}>{book.total_copies}</span>
                  </div>
                  <div className={styles.metaBox}>
                    <span className={styles.metaLabel}>Available</span>
                    <span className={`${styles.metaValue} ${isAvailable ? styles.metaAvailable : styles.metaUnavailable}`}>
                      {book.available_copies}
                    </span>
                  </div>
                  <div className={styles.metaBox}>
                    <span className={styles.metaLabel}>Status</span>
                    <span className={`${styles.metaValue} ${isAvailable ? styles.metaAvailable : styles.metaUnavailable}`}>
                      {isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ---- Issue Book Form ---- */}
            {activeSubView === 'issue' && isAdmin && (
              <div className={styles.formContainer}>
                <div className={styles.subViewHeader}>
                  <button className={styles.backBtn} onClick={goBack} aria-label="Back">&#8592;</button>
                  <span className={styles.subViewTitle}>Issue Book</span>
                </div>

                {issueSuccessMsg && (
                  <div className={styles.successBanner}>{issueSuccessMsg}</div>
                )}
                {issueErrorMsg && (
                  <div className={styles.errorBanner}>{issueErrorMsg}</div>
                )}

                <form onSubmit={handleIssueSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Member</label>
                    <SearchableDropdown
                      options={memberOptions}
                      placeholder="Search or type member name / email"
                      value={issueMemberId ? parseInt(issueMemberId) : ''}
                      onSelect={(opt) => {
                        setIssueMemberId(String(opt.value));
                      }}
                    />
                  </div>
                  <button type="submit" className={styles.btnSubmit} disabled={loading || !issueMemberId}>
                    {loading ? 'Issuing...' : 'Confirm Issue'}
                  </button>
                </form>

                {!addMemberOpen ? (
                  <button className={styles.addMemberLink} onClick={() => setAddMemberOpen(true)}>
                    Member not found? Add member
                  </button>
                ) : (
                  <form onSubmit={handleAddMember} className={styles.addMemberForm}>
                    {addMemberSuccess && (
                      <div className={styles.successBanner}>{addMemberSuccess}</div>
                    )}
                    {addMemberError && (
                      <div className={styles.errorBanner}>{addMemberError}</div>
                    )}
                    <div className={styles.formGroup}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Full name *"
                        value={newMember.name}
                        onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="Email address *"
                        value={newMember.email}
                        onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Phone (optional)"
                        value={newMember.phone}
                        onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                      />
                    </div>
                    <button type="submit" className={styles.btnAddMember} disabled={loading}>
                      {loading ? 'Adding...' : 'Add Member'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ---- Mark Returned Form ---- */}
            {activeSubView === 'return' && isAdmin && (
              <div className={styles.formContainer}>
                <div className={styles.subViewHeader}>
                  <button className={styles.backBtn} onClick={goBack} aria-label="Back">&#8592;</button>
                  <span className={styles.subViewTitle}>Mark as Returned</span>
                </div>

                {returnSuccessMsg && (
                  <div className={styles.successBanner}>{returnSuccessMsg}</div>
                )}
                {reservationBanner && (
                  <div className={styles.reservationBanner}>Queue update: {reservationBanner}</div>
                )}

                {loading ? (
                  <div className={styles.loadingText}>Loading active loans...</div>
                ) : bookActiveLoans.length === 0 ? (
                  <div style={{ color: 'var(--color-danger)', fontStyle: 'italic' }}>No active loans for this book.</div>
                ) : (
                  <form onSubmit={handleReturnConfirm} className={styles.form}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Select loan to return</label>
                      <select
                        className={styles.input}
                        value={selectedReturnLoan ? selectedReturnLoan.loan_id : ''}
                        onChange={e => {
                          const match = bookActiveLoans.find(l => l.loan_id === Number(e.target.value));
                          setSelectedReturnLoan(match || null);
                        }}
                      >
                        {bookActiveLoans.map(l => (
                          <option key={l.loan_id} value={l.loan_id}>
                            {l.user_name} — Issued: {l.issue_date}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedReturnLoan && (
                      <div className={styles.returnSummary}>
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryKey}>Due Date:</span>
                          <span className={styles.summaryVal}>{selectedReturnLoan.due_date}</span>
                        </div>
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryKey}>Return Date:</span>
                          <span className={styles.summaryVal}>{todayStr} (Today)</span>
                        </div>
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryKey}>Days Overdue:</span>
                          <span className={styles.summaryVal}>{returnDaysOverdue} day(s)</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryKey}>Grace Period:</span>
                          <span className={`${styles.summaryVal} ${styles.graceText}`}>2 Days</span>
                        </div>
                        <div className={styles.summaryRow}>
                          <span className={styles.summaryKey}>Fines Raised:</span>
                          <span className={styles.summaryVal} style={{
                            fontFamily: 'JetBrains Mono', fontWeight: 'bold',
                            color: returnFine > 0 ? 'var(--color-danger)' : '#059669'
                          }}>
                            ₹{returnFine.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    <button type="submit" className={styles.btnSubmit} disabled={loading || !selectedReturnLoan}>
                      {loading ? 'Processing...' : 'Confirm Return'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ---- Edit Details Form ---- */}
            {activeSubView === 'edit' && isAdmin && (
              <div className={styles.formContainer}>
                <div className={styles.subViewHeader}>
                  <button className={styles.backBtn} onClick={goBack} aria-label="Back">&#8592;</button>
                  <span className={styles.subViewTitle}>Edit Book Details</span>
                </div>
                <form onSubmit={handleEditSubmit} className={styles.form}>
                  {[
                    { field: 'title', label: 'Book Title *', required: true },
                    { field: 'author', label: 'Author *', required: true },
                    { field: 'genre', label: 'Genre' },
                    { field: 'isbn', label: 'ISBN' },
                  ].map(f => (
                    <div className={styles.formGroup} key={f.field}>
                      <label className={styles.label}>{f.label}</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm[f.field]}
                        onChange={e => setEditForm({ ...editForm, [f.field]: e.target.value })}
                        required={f.required}
                      />
                    </div>
                  ))}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Total Copies *</label>
                    <input type="number" min="1" className={styles.input} value={editForm.total_copies}
                      onChange={e => setEditForm({ ...editForm, total_copies: Number(e.target.value) })} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cover Image URL</label>
                    <input type="text" className={styles.input} value={editForm.cover_image_url}
                      onChange={e => setEditForm({ ...editForm, cover_image_url: e.target.value })} placeholder="e.g. /static/covers/123.jpg" />
                  </div>
                  <button type="submit" className={styles.btnSubmit} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Book Info'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirm dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteConfirm}
          message={`Are you sure you want to permanently delete "${book.title}"?`}
        />
      </div>
    </div>
  );
}
