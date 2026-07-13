// src/pages/admin/WaitlistPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminHeader } from '../../layouts/AdminShell';
import SearchableDropdown from '../../components/SearchableDropdown';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import { getBooks, getReservationsByBook, getAllReservations } from '../../api/api';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../utils/formatDate';
import styles from './WaitlistPage.module.css';

export default function WaitlistPage() {
  const setHeader = useAdminHeader();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const bookIdParam = searchParams.get('book_id');

  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // All-books reservation view (default when no book is selected).
  // Status can be preselected via ?status=waiting|ready (e.g. from Stats).
  const statusParam = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState(
    ['waiting', 'ready'].includes(statusParam) ? statusParam : 'all'
  );
  const [allQueue, setAllQueue] = useState(null);

  useEffect(() => {
    setHeader({ title: '', action: null });

    getBooks()
      .then(setBooks)
      .catch(err => toast.error('Failed to load books'));
  }, [setHeader]);

  useEffect(() => {
    if (bookIdParam && books.length > 0) {
      setSelectedBookId(Number(bookIdParam));
    }
  }, [bookIdParam, books]);

  useEffect(() => {
    if (selectedBookId) {
      setLoadingQueue(true);
      getReservationsByBook(selectedBookId)
        .then(setQueue)
        .catch(err => toast.error('Failed to load waitlist'))
        .finally(() => setLoadingQueue(false));
    } else {
      setQueue([]);
    }
  }, [selectedBookId]);

  useEffect(() => {
    if (!selectedBookId) {
      getAllReservations()
        .then(setAllQueue)
        .catch(() => toast.error('Failed to load reservations'));
    }
  }, [selectedBookId]);

  const selectedBook = books.find(b => b.id === selectedBookId);

  const filteredQueue = queue.filter(row => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      row.member_name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q)
    );
  });

  const filteredAll = (allQueue || []).filter(row => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      row.member_name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      row.book_title.toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.container}>
      {/* Filter Bar */}
      <div className={styles.topRow}>
        <div className={styles.dropdownWrapper}>
          {books.length > 0 && (
            <SearchableDropdown
              options={books}
              placeholder="Search for a book..."
              onSelect={(id) => {
                setSelectedBookId(id);
                setMemberSearch('');
              }}
              initialSelectedId={selectedBookId}
            />
          )}
        </div>

        <div className={styles.statusChips}>
          {['all', 'waiting', 'ready'].map(s => (
            <button
              key={s}
              type="button"
              className={`${styles.statusChip} ${statusFilter === s ? styles.statusChipActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'waiting' ? 'Waiting' : 'Ready for pickup'}
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper}>
          <Icon name="search" className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={selectedBook ? 'Filter by member name or email...' : 'Filter by member, email, or book...'}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
          {memberSearch && (
            <button className={styles.clearBtn} onClick={() => setMemberSearch('')}>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {!selectedBookId ? (
          allQueue === null ? (
            <div className={styles.loadingWrapper}>
              <span className="spinner"></span>
              Loading reservations...
            </div>
          ) : filteredAll.length === 0 ? (
            <div className={styles.noResults}>
              {statusFilter === 'ready'
                ? 'No reservations are ready for pickup.'
                : statusFilter === 'waiting'
                  ? 'No members are waiting in any queue.'
                  : 'No active reservations.'}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Book</th>
                    <th className={styles.th}>Rank</th>
                    <th className={styles.th}>Member</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Requested</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAll.map(row => (
                    <tr
                      key={row.reservation_id}
                      className={styles.tr}
                      onClick={() => setSelectedBookId(row.book_id)}
                      style={{ cursor: 'pointer' }}
                      title="View this book's queue"
                    >
                      <td className={styles.td} data-label="Book">{row.book_title}</td>
                      <td className={`${styles.td} ${styles.rankVal}`} data-label="Rank">#{row.queue_position}</td>
                      <td className={styles.td} data-label="Member">{row.member_name}</td>
                      <td className={styles.td} data-label="Email">{row.email}</td>
                      <td className={`${styles.td} ${styles.dateVal}`} data-label="Requested">{formatDate(row.requested_at)}</td>
                      <td className={styles.td} data-label="Status">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : loadingQueue ? (
          <div className={styles.loadingWrapper}>
            <span className="spinner"></span>
            Loading waitlist...
          </div>
        ) : queue.length === 0 ? (
          <div className={styles.noResults}>
            No members are waiting for "{selectedBook?.title}"
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Rank</th>
                  <th className={styles.th}>Member</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Requested</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map(row => (
                    <tr key={row.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.rankVal}`} data-label="Rank">#{row.position}</td>
                      <td className={styles.td} data-label="Member">{row.member_name}</td>
                      <td className={styles.td} data-label="Email">{row.email}</td>
                      <td className={`${styles.td} ${styles.dateVal}`} data-label="Requested">{formatDate(row.added_at)}</td>
                      <td className={styles.td} data-label="Status">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
              ))}
              </tbody>
            </table>

            {filteredQueue.length === 0 && (
              <div className={styles.noResults}>
                {memberSearch
                  ? `No members found matching "${memberSearch}"`
                  : statusFilter === 'ready'
                    ? 'No one is ready for pickup for this book.'
                    : 'No one is waiting for this book.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
