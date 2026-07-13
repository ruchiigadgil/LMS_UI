// src/components/NotificationPanel.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMemberLoans, getMemberReservations, getMemberFines, getCurrentUser } from '../api/api';
import Icon from './Icon';
import styles from './NotificationPanel.module.css';

// Dismissed notifications persist across reloads, keyed per user.
// Stale ids are pruned so the list doesn't grow forever.
function dismissedKey(userId) {
  return `verso_dismissed_notifs_${userId}`;
}

function getDismissed(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(dismissedKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
}

function saveDismissed(userId, ids) {
  localStorage.setItem(dismissedKey(userId), JSON.stringify([...ids]));
}

export default function NotificationPanel() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    const notifs = [];
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Check if account is suspended
    if (user.membership_status === 'suspended') {
      notifs.push({
        id: 'account-suspended',
        type: 'error',
        icon: 'alert',
        message: 'Your account has been suspended. Please contact the library administration.',
        timestamp: new Date(),
      });
    }

    try {
      // Check for overdue books and due soon
      const loans = await getMemberLoans(user.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      (loans || []).forEach(loan => {
        if (loan.status === 'active' && loan.due_date) {
          const dueDate = new Date(loan.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

          if (diffDays > 0) {
            notifs.push({
              id: `overdue-${loan.loan_id}`,
              type: 'warning',
              icon: 'alert',
              message: `"${loan.book_title}" is overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`,
              link: `/member/loans?highlight=${loan.loan_id}`,
              timestamp: new Date(),
            });
          } else if (diffDays === 0) {
            notifs.push({
              id: `due-today-${loan.loan_id}`,
              type: 'warning',
              icon: 'info',
              message: `"${loan.book_title}" is due today`,
              link: `/member/loans?highlight=${loan.loan_id}`,
              timestamp: new Date(),
            });
          } else if (diffDays >= -3) {
            notifs.push({
              id: `due-soon-${loan.loan_id}`,
              type: 'info',
              icon: 'book',
              message: `"${loan.book_title}" is due in ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`,
              link: `/member/loans?highlight=${loan.loan_id}`,
              timestamp: new Date(),
            });
          }
        }
      });
    } catch (err) {
      console.error('Failed to fetch loans for notifications:', err);
    }

    try {
      // Check for reservation updates
      const reservations = await getMemberReservations(user.id);

      (reservations || []).forEach(res => {
        if (res.status === 'ready') {
          notifs.push({
            id: `ready-${res.reservation_id}`,
            type: 'success',
            icon: 'book',
            message: `"${res.book_title}" is ready for pickup!`,
            link: `/member/holds?highlight=${res.reservation_id}`,
            timestamp: new Date(),
          });
        } else if (res.status === 'waiting' && res.queue_position) {
          notifs.push({
            // Position is part of the id so a queue change re-notifies
            // even if an earlier position update was dismissed.
            id: `queue-${res.reservation_id}-p${res.queue_position}`,
            type: 'info',
            icon: 'clipboardList',
            message: `Your position in queue for "${res.book_title}" is #${res.queue_position}`,
            link: `/member/holds?highlight=${res.reservation_id}`,
            timestamp: new Date(),
          });
        }
      });
    } catch (err) {
      console.error('Failed to fetch reservations for notifications:', err);
    }

    try {
      // Check for unpaid fines
      const fines = await getMemberFines(user.id);

      const unpaidFines = (fines || []).filter(f => f.status === 'unpaid');
      if (unpaidFines.length > 0) {
        const totalFine = unpaidFines.reduce((sum, f) => sum + (f.amount || 0), 0);
        notifs.push({
          // Total is part of the id so new fines re-notify after a dismissal.
          id: `unpaid-fines-${totalFine.toFixed(2)}`,
          type: 'warning',
          icon: 'creditCard',
          message: `You have $${totalFine.toFixed(2)} in unpaid fines`,
          link: '/member/fines?highlight=unpaid',
          timestamp: new Date(),
        });
      }
    } catch (err) {
      console.error('Failed to fetch fines for notifications:', err);
    }

    // Drop notifications the user already dismissed, and prune stored ids
    // that no longer correspond to a live notification.
    const dismissed = getDismissed(user.id);
    const currentIds = new Set(notifs.map(n => n.id));
    saveDismissed(user.id, [...dismissed].filter(id => currentIds.has(id)));
    const visible = notifs.filter(n => !dismissed.has(n.id));

    // Sort: error first, then warnings, then success, then info
    const priority = { error: 0, warning: 1, success: 2, info: 3 };
    visible.sort((a, b) => priority[a.type] - priority[b.type]);

    setNotifications(visible);
    setLoading(false);
  }

  function dismissNotification(id) {
    const user = getCurrentUser();
    if (user) {
      const dismissed = getDismissed(user.id);
      dismissed.add(id);
      saveDismissed(user.id, dismissed);
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {notifications.length > 0 && <Icon name="bell" className={styles.headerIcon} />}
          <h3 className={styles.title}>Notifications</h3>
        </div>
        {notifications.length > 0 && (
          <span className={styles.badge}>{notifications.length}</span>
        )}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <span className="spinner"></span>
            <span>Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No notifications</p>
          </div>
        ) : (
          <div className={styles.notificationList}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`${styles.notification} ${styles[notif.type]} ${notif.link ? styles.clickable : ''}`}
                onClick={() => notif.link && navigate(notif.link)}
                role={notif.link ? 'button' : undefined}
                tabIndex={notif.link ? 0 : undefined}
              >
                <p className={styles.notifMessage}>{notif.message}</p>
                <button
                  className={styles.dismissBtn}
                  onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                  aria-label="Dismiss"
                >
                  <Icon name="close" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
