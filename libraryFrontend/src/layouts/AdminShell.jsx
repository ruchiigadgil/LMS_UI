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
              <Icon name="books" className={styles.navIcon} />
              <span>Books</span>
            </NavLink>
            <NavLink 
              to="/admin/members" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="users" className={styles.navIcon} />
              <span>Members</span>
            </NavLink>
            <NavLink 
              to="/admin/loans" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="clipboardList" className={styles.navIcon} />
              <span>Loans</span>
            </NavLink>
            <NavLink 
              to="/admin/waitlist" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="bookmark" className={styles.navIcon} />
              <span>Waitlist</span>
            </NavLink>
            <NavLink 
              to="/admin/fines" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="receipt" className={styles.navIcon} />
              <span>Fines</span>
            </NavLink>
          </nav>
        </aside>

        <div className={styles.mainArea}>
          <header className={styles.brandBar}>
            <div className={styles.brandCenter}>
              <img src="/logo.png" alt="VERSO" className={styles.brandLogo} />
              <div className={styles.brandLine} />
            </div>
            <div className={styles.userDock}>
              <div className={styles.userMeta}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRole}>{user.role}</span>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <Icon name="logout" className={styles.buttonIcon} />
                <span>Log Out</span>
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
