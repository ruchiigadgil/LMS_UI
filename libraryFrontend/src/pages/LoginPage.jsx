// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getCurrentUser } from '../api/api';
import { useToast } from '../components/Toast';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState('member'); // 'member' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/books');
      } else {
        navigate('/books');
      }
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { user } = await login({ email, password, role });
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'admin') {
        navigate('/admin/books');
      } else {
        navigate('/books');
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="VERSO logo" className={styles.logoImage} />
          {/* <div className={styles.logoText}>VERSO</div>
          <div className={styles.tagline}>Behind the Shelf</div> */}
        </div>

        <div className={styles.toggleContainer}>
          <div
            className={`${styles.toggleTab} ${role === 'member' ? styles.toggleTabActive : ''}`}
            onClick={() => setRole('member')}
          >
            Member
          </div>
          <div
            className={`${styles.toggleTab} ${role === 'admin' ? styles.toggleTabActive : ''}`}
            onClick={() => setRole('admin')}
          >
            Admin
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              placeholder="e.g. member@verso.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          New member?{' '}
          <Link to="/signup" className={styles.footerLink}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
