// src/pages/admin/WaitlistPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminHeader } from '../../layouts/AdminShell';
import { MembersContext } from '../../components/MembersContext';
import SearchableDropdown from '../../components/SearchableDropdown';
import StatusBadge from '../../components/StatusBadge';
import { getBooks, addToWaitlist, getReservationsByBook } from '../../api/api';
import { useToast } from '../../components/Toast';
import styles from './WaitlistPage.module.css';

export default function WaitlistPage() {
  const setHeader = useAdminHeader();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const bookIdParam = searchParams.get('book_id');

  const { members, load: loadMembers } = useContext(MembersContext);
  const [books, setBooks] = useState([]);
  
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHeader({ title: 'Waitlist Manager', action: null });
    
    // Load dropdown options
    loadMembers();
    getBooks()
      .then(setBooks)
      .catch(err => toast.error('Failed to load books for waitlist'));
  }, [setHeader]);

  // Handle URL query parameters prefill
  useEffect(() => {
    if (bookIdParam && books.length > 0) {
      setSelectedBookId(Number(bookIdParam));
    }
  }, [bookIdParam, books]);

  // Load queue whenever a book is selected
  useEffect(() => {
    if (selectedBookId) {
      setLoadingQueue(true);
      getReservationsByBook(selectedBookId)
        .then(setQueue)
        .catch(err => toast.error('Failed to load waitlist queue'))
        .finally(() => setLoadingQueue(false));
    } else {
      setQueue([]);
    }
  }, [selectedBookId]);

  async function handleAddWaitlist(e) {
    e.preventDefault();
    if (!selectedBookId || !selectedMemberId) {
      toast.error('Please select both a book and a member');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addToWaitlist({ user_id: selectedMemberId, book_id: selectedBookId });
      toast.success(`Member added to waitlist! Position: #${res.queue_position}`);
      
      // Reset member dropdown
      setSelectedMemberId(null);

      // Reload queue
      const updatedQueue = await getReservationsByBook(selectedBookId);
      setQueue(updatedQueue);
    } catch (err) {
      toast.error(err.message || 'Failed to add to waitlist');
    } finally {
      setSubmitting(false);
    }
  }

  // Pre-fill labels for SearchableDropdowns
  const selectedBook = books.find(b => b.id === selectedBookId);

  return (
    <div className={styles.container}>
      <div className={styles.panelGrid}>
        
        {/* Left: Add Waitlist Form */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Add to Waitlist</h3>
          <form onSubmit={handleAddWaitlist} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Book</label>
              {books.length > 0 && (
                <SearchableDropdown
                  options={books}
                  placeholder="Type book title or ISBN..."
                  onSelect={(id) => setSelectedBookId(id)}
                  initialSelectedId={selectedBookId}
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Select Member</label>
              {members && (
                <SearchableDropdown
                  options={members}
                  placeholder="Type member name or email..."
                  onSelect={(id) => setSelectedMemberId(id)}
                  initialSelectedId={selectedMemberId}
                />
              )}
            </div>

            <button type="submit" className={styles.btnSubmit} disabled={submitting || !selectedBookId || !selectedMemberId}>
              {submitting ? 'Adding...' : 'Add Member to Queue'}
            </button>
          </form>
        </div>

        {/* Right: Queue List */}
        <div className={styles.card} style={{ padding: 0 }}>
          <div style={{ padding: '24px 24px 0 24px' }}>
            <h3 className={styles.cardTitle}>
              {selectedBook ? `Waitlist Queue for "${selectedBook.title}"` : 'Select a book to view queue'}
            </h3>
          </div>

          {!selectedBookId ? (
            <div className={styles.noSelection}>
              Choose a book from the waitlist dropdown to inspect its current reservations.
            </div>
          ) : loadingQueue ? (
            <div className={styles.loadingText}>
              <span className="spinner"></span> Loading queue records...
            </div>
          ) : queue.length === 0 ? (
            <div className={styles.noSelection}>
              No members are currently waiting for this book.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Position</th>
                    <th className={styles.th}>Member</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Added At</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(row => {
                    const isReady = row.status.toLowerCase() === 'ready';
                    const date = new Date(row.added_at).toLocaleString();
                    
                    return (
                      <tr key={row.id} className={`${styles.tr} ${isReady ? styles.trReady : ''}`}>
                        <td className={`${styles.td} ${styles.posVal}`}>#{row.position}</td>
                        <td className={styles.td} style={{ fontWeight: 600 }}>{row.member_name}</td>
                        <td className={styles.td}>{row.email}</td>
                        <td className={`${styles.td} ${styles.dateVal}`}>{date}</td>
                        <td className={styles.td}>
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
