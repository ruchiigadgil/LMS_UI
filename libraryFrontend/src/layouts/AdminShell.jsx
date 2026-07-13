// src/layouts/AdminShell.jsx
import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/api';
import { useToast } from '../components/Toast';
import Icon from '../components/Icon';
import styles from './AdminShell.module.css';

// Header content context
export const AdminHeaderContext = createContext(null);

export default function AdminShell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [headerState, setHeaderState] = useState({ title: 'VERSO', action: null });
  const [user, setUser] = useState(() => getCurrentUser());
  const isLoggingOut = useRef(false);

  useEffect(() => {
    if (isLoggingOut.current) return;
    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in first');
      navigate('/login');
    } else if (currentUser.role !== 'admin') {
      toast.error('Access denied. Admin portal only.');
      navigate('/books'); // Redirect members to Member view
    } else {
      setUser(currentUser);
    }
  }, [navigate, toast]);

  function handleLogout() {
    isLoggingOut.current = true;
    logout();
    toast.info('Logged out successfully');
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <AdminHeaderContext.Provider value={{ setHeaderState }}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink 
              to="/admin/books" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Books</span>
            </NavLink>
            <NavLink 
              to="/admin/members" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Members</span>
            </NavLink>
            <NavLink 
              to="/admin/loans" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Loans</span>
            </NavLink>
            <NavLink 
              to="/admin/waitlist" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Waitlist</span>
            </NavLink>
            <NavLink 
              to="/admin/fines" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Fines</span>
            </NavLink>
            <NavLink
              to="/admin/insights"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Insights</span>
            </NavLink>
            <NavLink
              to="/admin/logs"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <span>Logs</span>
            </NavLink>
          </nav>
        </aside>

        <div className={styles.mainArea}>
          <header className={styles.brandBar}>
            <h1 className={styles.brandText}>Verso</h1>
            <div className={styles.userMenu}>
              <span className={styles.userName}>
                <Icon name="user" className={styles.userIcon} />
                {user.name || user.username || 'Admin'}
              </span>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <Icon name="logout" className={styles.logoutIcon} />
                Logout
              </button>
            </div>
          </header>

          <header className={styles.pageBar}>
            <h1 className={styles.pageTitle}>{headerState.title}</h1>
            <div className={styles.actionArea}>{headerState.action}</div>
          </header>

          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  const context = useContext(AdminHeaderContext);
  if (!context) {
    throw new Error('useAdminHeader must be used inside AdminShell');
  }
  return context.setHeaderState;
}
