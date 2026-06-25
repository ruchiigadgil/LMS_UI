// src/components/BookDetailOverlay.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableDropdown from './SearchableDropdown';
import ConfirmDialog from './ConfirmDialog';
import { MembersContext } from './MembersContext';
import { useToast } from './Toast';
import Icon from './Icon';
import {
  issueBook,
  addMember,
  editBook,
  deleteBook,
  getActiveLoans,
  returnLoan
} from '../api/api';
import BookCard from './BookCard';
import styles from './BookDetailOverlay.module.css';

export default function BookDetailOverlay({ book, onClose, onUpdate, onDelete, isAdmin }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { members, setMembers, load: loadMembers } = useContext(MembersContext);

  const [activeSubView, setActiveSubView] = useState(null); // 'issue' | 'return' | 'edit'
  const [issueMemberId, setIssueMemberId] = useState(null);
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [miniName, setMiniName] = useState('');
  const [miniEmail, setMiniEmail] = useState('');
  const [miniPhone, setMiniphone] = useState('');

  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    genre: '',
    isbn: '',
    total_copies: 1,
    cover_image_url: ''
  });

  const [bookActiveLoans, setBookActiveLoans] = useState([]);
  const [selectedReturnLoan, setSelectedReturnLoan] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // Prefill forms and load dropdown data on mount
  useEffect(() => {
    if (book) {
      setEditForm({
        title: book.title || '',
        author: book.author || '',
        genre: book.genre || '',
        isbn: book.isbn || '',
        total_copies: book.total_copies || 1,
        cover_image_url: book.cover_image_url || ''
      });
      setActiveSubView(null);
      setIssueMemberId(null);
      setShowMiniForm(false);
      if (isAdmin) loadMembers();
    }
  }, [book, isAdmin]);

  // Fetch active loans when return sub-view opens
  useEffect(() => {
    if (activeSubView === 'return' && book) {
      setLoading(true);
      getActiveLoans()
        .then(loans => {
          const filtered = loans.filter(l => l.book_id === book.id);
          setBookActiveLoans(filtered);
          setSelectedReturnLoan(filtered.length > 0 ? filtered[0] : null);
        })
        .catch(err => toast.error('Failed to load active loans for this book'))
        .finally(() => setLoading(false));
    }
  }, [activeSubView, book, toast]);

  if (!book) return null;

  const isAvailable = book.available_copies > 0;

  // Cover URL helper
  const coverUrl = book.cover_image_url
    ? (book.cover_image_url.startsWith('http')
        ? book.cover_image_url
        : `http://localhost:5005${book.cover_image_url}`)
    : '/placeholder-cover.svg';

  // --- Handlers ---
  async function handleIssueSubmit(e) {
    e.preventDefault();
    if (!issueMemberId) { toast.error('Please select a member'); return; }
    setLoading(true);
    try {
      await issueBook({ user_id: issueMemberId, book_id: book.id });
      toast.success('Book issued successfully!');
      onUpdate({ ...book, available_copies: book.available_copies - 1 });
      setActiveSubView(null); setIssueMemberId(null); onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to issue book');
    } finally { setLoading(false); }
  }

  async function handleMiniRegister(e) {
    e.preventDefault();
    if (!miniName || !miniEmail) { toast.error('Name and Email are required'); return; }
    setLoading(true);
    try {
      const res = await addMember({ name: miniName, email: miniEmail, phone: miniPhone });
      const newMember = {
        id: res.member_id,
        name: miniName,
        email: miniEmail,
        phone: miniPhone,
        membership_status: 'active',
        active_loans: 0
      };
      if (members) setMembers(prev => [...prev, newMember]);
      else setMembers([newMember]);
      setIssueMemberId(res.member_id);
      setShowMiniForm(false);
      setMiniName(''); setMiniEmail(''); setMiniphone('');
      toast.success(`Registered and selected: ${newMember.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to register member');
    } finally { setLoading(false); }
  }

  async function handleReturnConfirm(e) {
    e.preventDefault();
    if (!selectedReturnLoan) return;
    setLoading(true);
    try {
      const result = await returnLoan(selectedReturnLoan.loan_id);
      if (result.fine_amount > 0) toast.success(`Book returned. Fine of Rs.${result.fine_amount} raised.`);
      else toast.success('Book returned. No fine.');
      if (result.reservation_msg) toast.info(result.reservation_msg);
      else if (result.message && result.message.includes('Reservation')) toast.info(result.message);
      onUpdate({ ...book, available_copies: book.available_copies + 1 });
      setActiveSubView(null); setSelectedReturnLoan(null); onClose();
    } catch (err) {
      toast.error(err.message || 'Return failed');
    } finally { setLoading(false); }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await editBook(book.id, editForm);
      toast.success('Book details updated');
      onUpdate({
        ...book,
        ...editForm,
        available_copies: book.available_copies + (editForm.total_copies - book.total_copies)
      });
      setActiveSubView(null); onClose();
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
      setShowDeleteConfirm(false); onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete book');
    } finally { setLoading(false); }
  }

  // Return details calculation
  let returnDaysOverdue = 0, returnFine = 0;
  if (selectedReturnLoan) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(selectedReturnLoan.due_date);
    const diff = today - dueDate;
    if (diff > 0) {
      returnDaysOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (returnDaysOverdue > 2) returnFine = (returnDaysOverdue - 2) * 10;
    }
  }

  // ==========================================
  // ISSUE VIEW - uses same layout as main panel
  // Left: Book card (cover + genre/ISBN)    Right: Issue form
  // ==========================================
  if (activeSubView === 'issue') {
    return (
      <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
        <div className={styles.issuePanel} onClick={e => e.stopPropagation()}>
          <div className={styles.issueHeader}>
            <button
              className={styles.returnLink}
              onClick={() => setActiveSubView(null)}
            >
              <Icon name="arrowLeft" className={styles.returnArrow} />
              <span>Return to Book Details</span>
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>
          </div>

          <div className={styles.issueBody}>
            {/* LEFT: Book card - same as main panel */}
            <div className={styles.left}>
              <BookCard book={book} />
            </div>

            {/* RIGHT: Issue form - centered, narrow */}
            <div className={styles.right}>
              <form onSubmit={handleIssueSubmit} className={styles.issueForm}>
                <h4 className={styles.issueFormTitle}>Issue Book</h4>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Member</label>
                  <SearchableDropdown
                    options={members || []}
                    placeholder="Type member name or email..."
                    onSelect={(id) => setIssueMemberId(id)}
                    initialSelectedId={issueMemberId}
                  />
                </div>

                {!showMiniForm ? (
                  <div className={styles.addMemberPrompt}>
                    <span>Member not found?</span>
                    <button
                      type="button"
                      className={styles.btnAddMember}
                      onClick={() => setShowMiniForm(true)}
                    >
                      Add member
                    </button>
                  </div>
                ) : (
                  <div className={styles.addMemberForm}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Name *</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={miniName}
                        onChange={e => setMiniName(e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email *</label>
                      <input
                        type="email"
                        className={styles.input}
                        value={miniEmail}
                        onChange={e => setMiniEmail(e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Phone</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={miniPhone}
                        onChange={e => setMiniphone(e.target.value)}
                        placeholder="Mobile number"
                      />
                    </div>
                    <div className={styles.addMemberActions}>
                      <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={() => { setShowMiniForm(false); setMiniName(''); setMiniEmail(''); setMiniphone(''); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={styles.btnRegister}
                        onClick={handleMiniRegister}
                        disabled={loading}
                      >
                        {loading ? 'Registering...' : 'Register Member'}
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" className={styles.btnSubmit} disabled={loading || !issueMemberId}>
                  {loading ? 'Issuing...' : 'Confirm Issue'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RETURN VIEW - same top-level swap behavior as issue view
  // ==========================================
  if (activeSubView === 'return') {
    return (
      <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
        <div className={styles.returnPanel} onClick={e => e.stopPropagation()}>
          <div className={styles.issueHeader}>
            <button
              className={styles.returnLink}
              onClick={() => setActiveSubView(null)}
            >
              <Icon name="arrowLeft" className={styles.returnArrow} />
              <span>Return to Book Details</span>
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>
          </div>

          <div className={styles.returnBody}>
            {/* LEFT: Book card */}
            <div className={styles.left}>
              <BookCard book={book} />
            </div>

            {/* RIGHT: Return form */}
            <div className={styles.right}>
              <div className={styles.subView}>
                <h4 className={styles.subTitle}>Mark as Returned</h4>
                {loading ? (
                  <div>Loading active loans...</div>
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
                            {l.user_name} (Issued: {l.issue_date})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedReturnLoan && (
                      <div className={styles.returnDetails}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Due Date:</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 500 }}>{selectedReturnLoan.due_date}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Return Date:</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 500 }}>{todayStr} (Today)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Days Overdue:</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 500 }}>{returnDaysOverdue} day(s)</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Grace period:</span>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>2 Days</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Fines raised:</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold', color: returnFine > 0 ? 'var(--color-danger)' : 'green' }}>
                            Rs.{returnFine.toFixed(2)}
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN OVERLAY â€" book detail view
  // ==========================================
  return (
    <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>

        <div className={styles.body}>
          {/* Left: Book Card */}
          <div className={styles.left}>
            <BookCard book={book} />
          </div>

          {/* Right: Details + Actions */}
          <div className={styles.right}>
            <span className={styles.panelTitle}>Book Specifications</span>

            <h3 className={styles.title}>{book.title}</h3>
            <div className={styles.author}>by {book.author || 'Unknown'}</div>
            {book.genre && <span className={styles.genreTag}>{book.genre}</span>}

            <div className={styles.meta}>
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

            {/* Action buttons â€" admin only */}
            {isAdmin && (
              <>
                <div className={styles.actionGrid}>
                  {isAvailable ? (
                    <button
                      className={`${styles.btnAction} ${styles.btnIssue}`}
                      onClick={() => setActiveSubView('issue')}
                    >
                      <Icon name="book" className={styles.btnIcon} />
                      <span>Issue Book</span>
                    </button>
                  ) : (
                    <button className={`${styles.btnAction} ${styles.btnIssue}`} disabled>
                      <Icon name="book" className={styles.btnIcon} />
                      <span>Issue Book</span>
                    </button>
                  )}
                  <button
                    className={`${styles.btnAction} ${styles.btnReturn}`}
                    onClick={() => setActiveSubView('return')}
                  >
                    <Icon name="return" className={styles.btnIcon} />
                    <span>Mark Returned</span>
                  </button>
                  <button
                    className={`${styles.btnAction} ${styles.btnEdit}`}
                    onClick={() => setActiveSubView('edit')}
                  >
                    <Icon name="edit" className={styles.btnIcon} />
                    <span>Edit Details</span>
                  </button>
                  <button
                    className={`${styles.btnAction} ${styles.btnDelete}`}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Icon name="trash" className={styles.btnIcon} />
                    <span>Delete Book</span>
                  </button>
                </div>

                {/* Sub-view: Edit */}
                {activeSubView === 'edit' && (
                  <div className={styles.subView}>
                    <h4 className={styles.subTitle}>Edit Book Details</h4>
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
                            type={f.field === 'total_copies' ? 'number' : 'text'}
                            className={styles.input}
                            min={f.field === 'total_copies' ? '1' : undefined}
                            value={editForm[f.field]}
                            onChange={e => setEditForm({
                              ...editForm,
                              [f.field]: f.field === 'total_copies' ? Number(e.target.value) : e.target.value
                            })}
                            required={f.required}
                          />
                        </div>
                      ))}
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Total Copies *</label>
                        <input
                          type="number" min="1"
                          className={styles.input}
                          value={editForm.total_copies}
                          onChange={e => setEditForm({ ...editForm, total_copies: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Cover Image URL</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={editForm.cover_image_url}
                          onChange={e => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                          placeholder="e.g. /static/covers/123.jpg"
                        />
                      </div>
                      <button type="submit" className={styles.btnSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Book Info'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Confirm delete */}
                <ConfirmDialog
                  isOpen={showDeleteConfirm}
                  onCancel={() => setShowDeleteConfirm(false)}
                  onConfirm={handleDeleteConfirm}
                  message={`Are you sure you want to permanently delete "${book.title}"?`}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

