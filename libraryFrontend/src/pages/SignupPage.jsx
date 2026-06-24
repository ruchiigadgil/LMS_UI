// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/api';
import { useToast } from '../components/Toast';
import styles from './Auth.module.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState('member'); // 'member' | 'admin'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [adminPasskey, setAdminPasskey] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email,
        phone,
        password,
        role,
        adminPasskey: role === 'admin' ? adminPasskey : undefined
      });
      toast.success('Registration successful! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address *</label>
            <input
              type="email"
              className={styles.input}
              placeholder="e.g. jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input
              type="tel"
              className={styles.input}
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password *</label>
            <input
              type="password"
              className={styles.input}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {role === 'admin' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Admin Passkey *</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Use admin123"
                value={adminPasskey}
                onChange={(e) => setAdminPasskey(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          Already registered?{' '}
          <Link to="/login" className={styles.footerLink}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
