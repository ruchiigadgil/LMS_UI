// src/components/NotificationPanel.jsx
import React, { useState, useEffect } from 'react';
import { getMemberLoans, getMemberReservations, getMemberFines, getCurrentUser } from '../api/api';
import Icon from './Icon';
import styles from './NotificationPanel.module.css';

export default function NotificationPanel() {
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
              id: `overdue-${loan.id}`,
              type: 'warning',
              icon: 'alert',
              message: `"${loan.book_title}" is overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`,
              timestamp: new Date(),
            });
          } else if (diffDays === 0) {
            notifs.push({
              id: `due-today-${loan.id}`,
              type: 'warning',
              icon: 'info',
              message: `"${loan.book_title}" is due today`,
              timestamp: new Date(),
            });
          } else if (diffDays >= -3) {
            notifs.push({
              id: `due-soon-${loan.id}`,
              type: 'info',
              icon: 'book',
              message: `"${loan.book_title}" is due in ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`,
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
            id: `ready-${res.id}`,
            type: 'success',
            icon: 'book',
            message: `"${res.book_title}" is ready for pickup!`,
            timestamp: new Date(),
          });
        } else if (res.status === 'waiting' && res.queue_position) {
          notifs.push({
            id: `queue-${res.id}`,
            type: 'info',
            icon: 'clipboardList',
            message: `Your position in queue for "${res.book_title}" is #${res.queue_position}`,
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
          id: 'unpaid-fines',
          type: 'warning',
          icon: 'creditCard',
          message: `You have $${totalFine.toFixed(2)} in unpaid fines`,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      console.error('Failed to fetch fines for notifications:', err);
    }

    // Sort: warnings first, then success, then info
    const priority = { warning: 0, success: 1, info: 2 };
    notifs.sort((a, b) => priority[a.type] - priority[b.type]);

    setNotifications(notifs);
    setLoading(false);
  }

  function dismissNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Icon name="bell" className={styles.headerIcon} />
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
            <Icon name="book" className={styles.emptyIcon} />
            <p>No notifications</p>
          </div>
        ) : (
          <div className={styles.notificationList}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`${styles.notification} ${styles[notif.type]}`}
              >
                <div className={styles.notifIcon}>
                  <Icon name={notif.icon} />
                </div>
                <p className={styles.notifMessage}>{notif.message}</p>
                <button
                  className={styles.dismissBtn}
                  onClick={() => dismissNotification(notif.id)}
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
