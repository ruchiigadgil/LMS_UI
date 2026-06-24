// src/components/Drawer.jsx
import React, { useEffect, useRef } from 'react';
import styles from './Drawer.module.css';

export default function Drawer({ isOpen, onClose, title, children }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel} ref={drawerRef} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel">
            &times;
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </>
  );
}
