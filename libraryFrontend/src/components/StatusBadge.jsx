// src/components/StatusBadge.jsx
import React from 'react';
import styles from './StatusBadge.module.css';

export default function StatusBadge({ status }) {
  if (!status) return null;
  
  const normalized = status.toLowerCase().replace('_', '');
  const classKey = styles[normalized] || '';

  return (
    <span className={`${styles.badge} ${classKey}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
