// src/components/ConfirmDialog.jsx
import React from 'react';
import Modal from './Modal';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, message = 'Are you sure you want to perform this action?' }) {
  const footer = (
    <>
      <button className={styles.btnCancel} onClick={onCancel}>
        Cancel
      </button>
      <button className={styles.btnConfirm} onClick={onConfirm}>
        Confirm
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Are you sure?"
      footer={footer}
    >
      <div className={styles.message}>
        {message}
      </div>
    </Modal>
  );
}
