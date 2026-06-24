// src/components/MembersContext.jsx
import React, { createContext, useState } from 'react';
import { getMembers } from '../api/api';

export const MembersContext = createContext(null);

export const MembersProvider = ({ children }) => {
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (force = false) => {
    if (members && !force) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (err) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MembersContext.Provider value={{ members, setMembers, load, loading, error }}>
      {children}
    </MembersContext.Provider>
  );
};
