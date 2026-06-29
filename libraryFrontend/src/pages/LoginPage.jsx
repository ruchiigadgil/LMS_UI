// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getCurrentUser, checkEmail, resetPassword } from '../api/api';
import { useToast } from '../components/Toast';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState('member'); // 'member' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false); // 'email' | 'reset' | false
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  async function handleCheckEmail(e) {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await checkEmail(resetEmail);
      toast.success('Email verified! Enter your new password.');
      setForgotMode('reset');
    } catch (err) {
      toast.error(err.message || 'Email not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email: resetEmail, new_password: newPassword });
      toast.success('Password reset successfully! You can now log in.');
      setForgotMode(false);
      setResetEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    setForgotMode(false);
    setResetEmail('');
    setNewPassword('');
    setConfirmPassword('');
  }

  // Forgot password - email verification step
  if (forgotMode === 'email') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img src="/logo.png" alt="VERSO logo" className={styles.logoImage} />
            <div className={styles.logoText}>VERSO</div>
            <div className={styles.tagline}>Reset Password</div>
          </div>

          <form className={styles.form} onSubmit={handleCheckEmail}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Enter your registered email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="e.g. member@verso.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className={styles.footer}>
            <span onClick={handleBackToLogin} className={styles.footerLink} style={{ cursor: 'pointer' }}>
              Back to Login
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password - set new password step
  if (forgotMode === 'reset') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img src="/logo.png" alt="VERSO logo" className={styles.logoImage} />
            <div className={styles.logoText}>VERSO</div>
            <div className={styles.tagline}>Set New Password</div>
          </div>

          <form className={styles.form} onSubmit={handleResetPassword}>
            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className={styles.footer}>
            <span onClick={handleBackToLogin} className={styles.footerLink} style={{ cursor: 'pointer' }}>
              Back to Login
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="VERSO logo" className={styles.logoImage} />
          <div className={styles.logoText}>VERSO</div>
          <div className={styles.tagline}>Behind the Shelf</div>
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
          <span
            onClick={() => setForgotMode('email')}
            className={styles.footerLink}
            style={{ cursor: 'pointer' }}
          >
            Forgot Password?
          </span>
        </div>

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
