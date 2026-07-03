// src/pages/admin/WaitlistPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminHeader } from '../../layouts/AdminShell';
import SearchableDropdown from '../../components/SearchableDropdown';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import { getBooks, getReservationsByBook } from '../../api/api';
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

  const selectedBook = books.find(b => b.id === selectedBookId);

  const filteredQueue = queue.filter(row => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      row.member_name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q)
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

        {selectedBook && (
          <div className={styles.searchWrapper}>
            <Icon name="search" className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Filter by member name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            {memberSearch && (
              <button className={styles.clearBtn} onClick={() => setMemberSearch('')}>
                &times;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {!selectedBookId ? (
          <div className={styles.noResults}>
            Select a book to view its waitlist queue
          </div>
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
                      <td className={`${styles.td} ${styles.rankVal}`}>#{row.position}</td>
                      <td className={styles.td}>{row.member_name}</td>
                      <td className={styles.td}>{row.email}</td>
                      <td className={`${styles.td} ${styles.dateVal}`}>{formatDate(row.added_at)}</td>
                      <td className={styles.td}>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
              ))}
              </tbody>
            </table>

            {filteredQueue.length === 0 && memberSearch && (
              <div className={styles.noResults}>
                No members found matching "{memberSearch}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
