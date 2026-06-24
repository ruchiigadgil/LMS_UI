// src/pages/admin/MembersPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useAdminHeader } from '../../layouts/AdminShell';
import { MembersContext } from '../../components/MembersContext';
import { addMember, editMember, deleteMember } from '../../api/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/Icon';
import styles from './MembersPage.module.css';

export default function MembersPage() {
  const setHeader = useAdminHeader();
  const toast = useToast();
  const { members, setMembers, load: loadMembers, loading, error } = useContext(MembersContext);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms state
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', membership_status: 'active' });

  // Load members on mount
  useEffect(() => {
    loadMembers();
  }, []);

  // Update header action button
  useEffect(() => {
    setHeader({
      title: 'Members',
      action: (
        <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
          <Icon name="plus" className={styles.btnIcon} />
          <span>Add Member</span>
        </button>
      )
    });
  }, [setHeader]);

  // Set up prefill when editing a member
  useEffect(() => {
    if (editingMember) {
      setEditForm({
        name: editingMember.name || '',
        email: editingMember.email || '',
        phone: editingMember.phone || '',
        membership_status: editingMember.membership_status || 'active'
      });
    }
  }, [editingMember]);

  // Filter members client-side
  const filteredMembers = (members || []).filter(member => {
    const q = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      (member.phone && member.phone.toLowerCase().includes(q))
    );
  });

  // --- Handlers ---
  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!addForm.name || !addForm.email) {
      toast.error('Name and Email are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addMember(addForm);
      toast.success('Member added successfully');
      
      const newMemberObj = {
        id: res.member_id,
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone,
        membership_status: 'active',
        active_loans: 0
      };

      setMembers(prev => [...(prev || []), newMemberObj]);

      // Reset
      setAddForm({ name: '', email: '', phone: '' });
      setIsAddModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editForm.name || !editForm.email) {
      toast.error('Name and Email are required');
      return;
    }

    setSubmitting(true);
    try {
      await editMember(editingMember.id, editForm);
      toast.success('Member updated successfully');

      setMembers(prev => prev.map(m => 
        m.id === editingMember.id 
          ? { ...m, ...editForm } 
          : m
      ));

      setEditingMember(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update member');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setSubmitting(true);
    try {
      await deleteMember(deletingMember.id);
      toast.success('Member deleted successfully');

      setMembers(prev => prev.filter(m => m.id !== deletingMember.id));
      setDeletingMember(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete member');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Search filter bar */}
      <div className={styles.searchBarWrapper}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Filter by name, email, or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading && !members ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading registry...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>
          <button
            onClick={() => loadMembers(true)}
            style={{ marginTop: '12px', textDecoration: 'underline' }}
          >
            Retry Loading
          </button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.noResults}>
            No members found matching "{searchQuery}"
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>ID</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Phone</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Active Loans</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                  <tr key={member.id} className={styles.tr}>
                    <td className={`${styles.td} ${styles.idVal}`}>{member.id}</td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>{member.name}</td>
                    <td className={styles.td}>{member.email}</td>
                    <td className={styles.td}>{member.phone || '—'}</td>
                    <td className={styles.td}>
                      <StatusBadge status={member.membership_status || 'ACTIVE'} />
                    </td>
                    <td className={`${styles.td} ${styles.loansVal}`}>
                      {member.active_loans} / 5
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionBtns}>
                        <button className={styles.btnEdit} onClick={() => setEditingMember(member)}>
                          Edit
                        </button>
                        <button className={styles.btnDelete} onClick={() => setDeletingMember(member)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Member"
      >
        <form onSubmit={handleAddSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              className={styles.input}
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              required
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address *</label>
            <input
              type="email"
              className={styles.input}
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              required
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number (Optional)</label>
            <input
              type="tel"
              className={styles.input}
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              disabled={submitting}
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? 'Registering...' : 'Add Member'}
          </button>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={editingMember !== null}
        onClose={() => setEditingMember(null)}
        title="Edit Member Details"
      >
        <form onSubmit={handleEditSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              className={styles.input}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address *</label>
            <input
              type="email"
              className={styles.input}
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number (Optional)</label>
            <input
              type="tel"
              className={styles.input}
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Membership Status *</label>
            <select
              className={styles.select}
              value={editForm.membership_status}
              onChange={(e) => setEditForm({ ...editForm, membership_status: e.target.value })}
              disabled={submitting}
            >
              <option value="active">ACTIVE</option>
              <option value="suspended">SUSPENDED</option>
              <option value="expired">EXPIRED</option>
            </select>
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingMember !== null}
        onCancel={() => setDeletingMember(null)}
        onConfirm={handleDeleteConfirm}
        message={deletingMember ? `Are you sure you want to permanently delete the member account for "${deletingMember.name}"?` : ''}
      />
    </div>
  );
}
