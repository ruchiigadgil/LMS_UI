// src/layouts/MemberShell.jsx
import React, { useState, createContext, useContext, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/api';
import { useToast } from '../components/Toast';
import Icon from '../components/Icon';
import styles from './MemberShell.module.css';

export const MemberHeaderContext = createContext(null);

export default function MemberShell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [headerState, setHeaderState] = useState({ title: 'VERSO', action: null });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in first');
      navigate('/login');
    } else {
      setUser(currentUser);
    }
  }, [navigate, toast]);

  function handleLogout() {
    logout();
    setUser(null);
    toast.info('Logged out successfully');
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <MemberHeaderContext.Provider value={{ setHeaderState }}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink 
              to="/books" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="books" className={styles.navIcon} />
              <span>Browse Books</span>
            </NavLink>
            <NavLink 
              to="/member/loans" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="clipboardList" className={styles.navIcon} />
              <span>My Loans</span>
            </NavLink>
            <NavLink 
              to="/member/fines" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <Icon name="receipt" className={styles.navIcon} />
              <span>My Fines</span>
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
    </MemberHeaderContext.Provider>
  );
}

export function useMemberHeader() {
  const context = useContext(MemberHeaderContext);
  if (!context) {
    throw new Error('useMemberHeader must be used inside MemberShell');
  }
  return context.setHeaderState;
}
