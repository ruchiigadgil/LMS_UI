// src/layouts/MemberShell.jsx
import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "../api/api";
import { useToast } from "../components/Toast";
import Icon from "../components/Icon";
import NotificationPanel from "../components/NotificationPanel";
import styles from "./MemberShell.module.css";

export const MemberHeaderContext = createContext(null);

export default function MemberShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [headerState, setHeaderState] = useState({
    title: "VERSO",
    action: null,
  });
  const [user, setUser] = useState(() => getCurrentUser());
  const isLoggingOut = useRef(false);
  const hasCheckedAuth = useRef(false);

  const isDashboard = location.pathname === "/books";

  useEffect(() => {
    if (hasCheckedAuth.current || isLoggingOut.current) return;
    hasCheckedAuth.current = true;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error("Please sign in first");
      navigate("/login");
    } else {
      setUser(currentUser);
    }
  }, []);

  function handleLogout() {
    isLoggingOut.current = true;
    logout();
    toast.info("Logged out successfully");
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  return (
    <MemberHeaderContext.Provider value={{ setHeaderState }}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink
              to="/books"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeLink : ""}`
              }
            >
              <Icon name="books" className={styles.navIcon} />
              <span>Browse Books</span>
            </NavLink>
            <NavLink
              to="/member/loans"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeLink : ""}`
              }
            >
              <Icon name="clipboardList" className={styles.navIcon} />
              <span>My Loans</span>
            </NavLink>
            <NavLink
              to="/member/fines"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeLink : ""}`
              }
            >
              <Icon name="receipt" className={styles.navIcon} />
              <span>My Fines</span>
            </NavLink>
            <NavLink
              to="/member/holds"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeLink : ""}`
              }
            >
              <Icon name="receipt" className={styles.navIcon} />
              <span>Reservations</span>
            </NavLink>
          </nav>
        </aside>

        <div className={styles.mainArea}>
          <header className={styles.brandBar}>
            <h1 className={styles.brandText}>Verso</h1>
            <div className={styles.userMenu}>
              <span className={styles.userName}>
                <Icon name="user" className={styles.userIcon} />
                {user.name || user.username || 'User'}
              </span>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <Icon name="logout" className={styles.logoutIcon} />
                Logout
              </button>
            </div>
          </header>

          <div className={styles.contentWrapper}>
            <main className={styles.content}>
              <Outlet />
            </main>

            {/* Notification Panel - only on dashboard */}
            {isDashboard && <NotificationPanel />}
          </div>

          {/* Coffee corner decoration */}
          <img
            src="/Right_Corner_Coffee.png"
            alt=""
            className={styles.coffeeCorner}
            aria-hidden="true"
          />
        </div>
      </div>
    </MemberHeaderContext.Provider>
  );
}

export function useMemberHeader() {
  const context = useContext(MemberHeaderContext);
  if (!context) {
    throw new Error("useMemberHeader must be used inside MemberShell");
  }
  return context.setHeaderState;
}
