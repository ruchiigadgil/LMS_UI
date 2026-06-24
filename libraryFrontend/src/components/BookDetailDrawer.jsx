// src/components/BookDetailDrawer.jsx
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
import styles from './BookDetailDrawer.module.css';

export default function BookDetailDrawer({ book, isOpen, onClose, onUpdate, onDelete }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { members, setMembers, load: loadMembers } = useContext(MembersContext);

  const [activeSubView, setActiveSubView] = useState(null); // 'issue' | 'return' | 'edit'
  const [issueMemberId, setIssueMemberId] = useState(null);
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms
  const [miniName, setMiniName] = useState('');
  const [miniEmail, setMiniEmail] = useState('');
  const [miniPhone, setMiniPhone] = useState('');

  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    genre: '',
    isbn: '',
    total_copies: 1,
    cover_image_url: ''
  });

  // Returns list for "Mark as Returned" dropdown
  const [bookActiveLoans, setBookActiveLoans] = useState([]);
  const [selectedReturnLoan, setSelectedReturnLoan] = useState(null);

  // Confirm delete dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Today string for return display
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // Prefill edit form and fetch dropdown data when drawer opens
  useEffect(() => {
    if (isOpen && book) {
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

      // Load members for Issue dropdown
      loadMembers();
    }
  }, [isOpen, book]);

  // Fetch active loans when 'return' view is opened
  useEffect(() => {
    if (activeSubView === 'return' && book) {
      setLoading(true);
      getActiveLoans()
        .then(loans => {
          const filtered = loans.filter(l => l.book_id === book.id);
          setBookActiveLoans(filtered);
          if (filtered.length > 0) {
            setSelectedReturnLoan(filtered[0]);
          } else {
            setSelectedReturnLoan(null);
          }
        })
        .catch(err => toast.error('Failed to load active loans for this book'))
        .finally(() => setLoading(false));
    }
  }, [activeSubView, book]);

  if (!book) return null;

  const isAvailable = book.available_copies > 0;
  const coverUrl = book.cover_image_url
    ? (book.cover_image_url.startsWith('http')
        ? book.cover_image_url
        : `http://localhost:5005${book.cover_image_url}`)
    : '/placeholder-cover.svg';

  // --- Handlers ---
  async function handleIssueSubmit(e) {
    e.preventDefault();
    if (!issueMemberId) {
      toast.error('Please select a member');
      return;
    }

    setLoading(true);
    try {
      const res = await issueBook({ user_id: issueMemberId, book_id: book.id });
      toast.success(`Book issued successfully!`);

      // Update parent list
      onUpdate({
        ...book,
        available_copies: book.available_copies - 1
      });

      // Clear states
      setActiveSubView(null);
      setIssueMemberId(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to issue book');
    } finally {
      setLoading(false);
    }
  }

  async function handleMiniRegister(e) {
    e.preventDefault();
    if (!miniName || !miniEmail) {
      toast.error('Name and Email are required');
      return;
    }

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

      // Update context cache so it doesn't need to refetch
      if (members) {
        setMembers(prev => [...prev, newMember]);
      } else {
        setMembers([newMember]);
      }

      // Auto-select in dropdown
      setIssueMemberId(res.member_id);

      // Close mini-form
      setShowMiniForm(false);
      setMiniName('');
      setMiniEmail('');
      setMiniPhone('');
      toast.success(`Member registered and selected: ${newMember.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnConfirm(e) {
    e.preventDefault();
    if (!selectedReturnLoan) return;

    setLoading(true);
    try {
      const result = await returnLoan(selectedReturnLoan.loan_id);

      if (result.fine_amount > 0) {
        toast.success(`Book returned. Fine of ₹${result.fine_amount} raised.`);
      } else {
        toast.success('Book returned. No fine.');
      }

      if (result.reservation_msg) {
        toast.info(result.reservation_msg);
      } else if (result.message && result.message.includes('Reservation')) {
        toast.info(result.message);
      }

      // Update parent available count
      onUpdate({
        ...book,
        available_copies: book.available_copies + 1
      });

      // Clear states
      setActiveSubView(null);
      setSelectedReturnLoan(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Return failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await editBook(book.id, editForm);
      toast.success('Book details updated successfully');

      // Update parent list
      onUpdate({
        ...book,
        ...editForm,
        available_copies: book.available_copies + (editForm.total_copies - book.total_copies)
      });

      setActiveSubView(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to edit book');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    setLoading(true);
    try {
      await deleteBook(book.id);
      toast.success('Book deleted successfully');
      onDelete(book.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete book');
    } finally {
      setLoading(false);
    }
  }

  // Calculate return details for inline return display
  let returnDaysOverdue = 0;
  let returnFine = 0;
  if (selectedReturnLoan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(selectedReturnLoan.due_date);
    const diff = today - dueDate;
    if (diff > 0) {
      returnDaysOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (returnDaysOverdue > 2) {
        returnFine = (returnDaysOverdue - 2) * 10;
      }
    }
  }

  return (
    <div className={styles.panel}>
      {/* Header with close button */}
      <div className={styles.panelHeader}>
        <span>Book Details</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel">
          &times;
        </button>
      </div>

      <div className={styles.panelBody}>
        {/* Cover image */}
        <div className={styles.coverWrapper}>
          <img
            src={coverUrl}
            alt={book.title}
            className={styles.cover}
            onError={(e) => e.target.src = '/placeholder-cover.svg'}
          />
        </div>

        <h3 className={styles.title}>{book.title}</h3>
        <div className={styles.author}>by {book.author || 'Unknown'}</div>
        {book.genre && <div className={styles.genre}>{book.genre}</div>}

        <div className={styles.metaGrid}>
          <div className={styles.metaBox}>
            <span className={styles.metaLabel}>ISBN</span>
            <span className={styles.metaVal}>{book.isbn || 'N/A'}</span>
          </div>
          <div className={styles.metaBox}>
            <span className={styles.metaLabel}>Total Copies</span>
            <span className={styles.metaVal}>{book.total_copies}</span>
          </div>
          <div className={styles.metaBox}>
            <span className={styles.metaLabel}>In Circulation</span>
            <span className={styles.metaVal}>{book.total_copies - book.available_copies}</span>
          </div>
          <div className={styles.metaBox}>
            <span className={styles.metaLabel}>Available</span>
            <span className={styles.metaVal}>{book.available_copies}</span>
          </div>
        </div>

        <div className={`${styles.indicator} ${isAvailable ? styles.indicatorAvailable : styles.indicatorOverdue}`}>
          {isAvailable ? 'In stock - available to borrow' : 'Out of stock'}
        </div>

        <div className={styles.actionGrid}>
          {isAvailable ? (
            <button className={`${styles.btnAction} ${styles.btnIssue}`} onClick={() => setActiveSubView('issue')}>
              <Icon name="book" className={styles.btnIcon} />
              <span>Issue Book</span>
            </button>
          ) : (
            <div className={styles.tooltip}>
              <button className={`${styles.btnAction} ${styles.btnIssue}`} disabled>
                <Icon name="book" className={styles.btnIcon} />
                <span>Issue Book</span>
              </button>
              <span className={styles.tooltipText}>
                No copies available.{' '}
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    navigate(`/admin/waitlist?book_id=${book.id}`);
                  }}
                  className={styles.inlineLink}
                >
                  Add to Waitlist instead
                </a>
              </span>
            </div>
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

        {/* ==========================================
           SUB-VIEWS (Inline Forms)
           ========================================== */}

        {/* 1. ISSUE BOOK SUB-VIEW */}
        {activeSubView === 'issue' && (
          <div className={styles.subView}>
            <h4 className={styles.subTitle}>Issue Book</h4>
            <form onSubmit={handleIssueSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Member</label>
                <SearchableDropdown
                  options={members || []}
                  placeholder="Type member name or email..."
                  onSelect={(id) => setIssueMemberId(id)}
                  initialSelectedId={issueMemberId}
                />
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={styles.expandLink} onClick={() => setShowMiniForm(!showMiniForm)}>
                  {showMiniForm ? 'Cancel new registration' : 'Member not found? Register here'}
                </span>
              </div>

              {showMiniForm && (
                <div className={styles.miniForm}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '4px' }}>
                    Register Member Inline
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={miniName}
                      onChange={(e) => setMiniName(e.target.value)}
                      required={showMiniForm}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email *</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={miniEmail}
                      onChange={(e) => setMiniEmail(e.target.value)}
                      required={showMiniForm}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone (Optional)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={miniPhone}
                      onChange={(e) => setMiniPhone(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMiniRegister}
                    className={styles.btnSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Register & Continue'}
                  </button>
                </div>
              )}

              <button type="submit" className={styles.btnSubmit} disabled={loading || !issueMemberId}>
                {loading ? 'Issuing...' : 'Confirm Handover & Issue'}
              </button>
            </form>
          </div>
        )}

        {/* 2. MARK RETURNED SUB-VIEW */}
        {activeSubView === 'return' && (
          <div className={styles.subView}>
            <h4 className={styles.subTitle}>Mark as Returned</h4>
            {loading ? (
              <div>Loading active loans...</div>
            ) : bookActiveLoans.length === 0 ? (
              <div style={{ color: 'var(--color-danger)', fontStyle: 'italic' }}>
                There are no active loans for this book.
              </div>
            ) : (
              <form onSubmit={handleReturnConfirm} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select loan to return</label>
                  <select
                    className={styles.input}
                    value={selectedReturnLoan ? selectedReturnLoan.loan_id : ''}
                    onChange={(e) => {
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
                  <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '14px', borderRadius: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      <span style={{
                        fontFamily: 'JetBrains Mono',
                        fontWeight: 'bold',
                        color: returnFine > 0 ? 'var(--color-danger)' : 'green'
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

        {/* 3. EDIT BOOK SUB-VIEW */}
        {activeSubView === 'edit' && (
          <div className={styles.subView}>
            <h4 className={styles.subTitle}>Edit Book Details</h4>
            <form onSubmit={handleEditSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Book Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Author *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editForm.author}
                  onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Genre</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editForm.genre}
                  onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>ISBN</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editForm.isbn}
                  onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Total Copies *</label>
                <input
                  type="number"
                  min="1"
                  className={styles.input}
                  value={editForm.total_copies}
                  onChange={(e) => setEditForm({ ...editForm, total_copies: Number(e.target.value) })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cover Image URL</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editForm.cover_image_url}
                  onChange={(e) => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                  placeholder="e.g. /static/covers/123.jpg"
                />
              </div>
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save Book Info'}
              </button>
            </form>
          </div>
        )}

        {/* Confirm deletion dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteConfirm}
          message={`Are you sure you want to permanently delete the book "${book.title}"? This action cannot be undone.`}
        />
      </div>
    </div>
  );
}
