// src/pages/admin/LogsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAdminHeader } from '../../layouts/AdminShell';
import { getAdminLogs } from '../../api/api';
import Icon from '../../components/Icon';
import { formatDate } from '../../utils/formatDate';
import styles from './LogsPage.module.css';

const TYPES = [
  { key: 'all', label: 'All' },
  { key: 'issue', label: 'Issued' },
  { key: 'return', label: 'Returned' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'fine', label: 'Fines' },
  { key: 'inventory', label: 'Inventory' },
];

const TYPE_LABELS = {
  issue: 'Issued',
  return: 'Returned',
  waitlist: 'Waitlist',
  fine: 'Fine',
  inventory: 'Inventory',
};

export default function LogsPage() {
  const setHeader = useAdminHeader();

  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setHeader({ title: '', action: null });
  }, [setHeader]);

  useEffect(() => {
    function load() {
      getAdminLogs()
        .then(data => {
          setLogs(data);
          setError(null);
        })
        .catch(err => setError(err.message || 'Failed to load logs'));
    }
    load();
    // Refresh whenever the admin comes back to this tab/window, so actions
    // taken elsewhere show up without a manual reload.
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  const filtered = (logs || []).filter(log => {
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    if (!search.trim()) return true;
    return log.message.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.chips}>
          {TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              className={`${styles.chip} ${typeFilter === t.key ? styles.chipActive : ''}`}
              onClick={() => setTypeFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper}>
          <Icon name="search" className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by member, book, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>
              &times;
            </button>
          )}
        </div>
      </div>

      <div className={styles.logCard}>
        {error ? (
          <div className={styles.stateMsg}>{error}</div>
        ) : logs === null ? (
          <div className={styles.stateMsg}>
            <span className="spinner"></span> Loading logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.stateMsg}>No log entries found.</div>
        ) : (
          <ul className={styles.logList}>
            {filtered.map(log => (
              <li key={log.id} className={styles.logItem}>
                <span className={`${styles.typeBadge} ${styles['type_' + log.type]}`}>
                  {TYPE_LABELS[log.type] || log.type}
                </span>
                <span className={styles.message}>{log.message}</span>
                <span className={styles.date}>{formatDate(log.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
