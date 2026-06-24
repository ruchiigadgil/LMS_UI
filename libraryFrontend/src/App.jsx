// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminShell from './layouts/AdminShell';
import MemberShell from './layouts/MemberShell';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Admin Pages
import BooksPage from './pages/admin/BooksPage';
import MembersPage from './pages/admin/MembersPage';
import LoansPage from './pages/admin/LoansPage';
import WaitlistPage from './pages/admin/WaitlistPage';
import FinesPage from './pages/admin/FinesPage';

// Member Pages
import BrowseBooksPage from './pages/member/BrowseBooksPage';
import MyLoansPage from './pages/member/MyLoansPage';
import MyFinesPage from './pages/member/MyFinesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Admin portal */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="/admin/books" replace />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="waitlist" element={<WaitlistPage />} />
          <Route path="fines" element={<FinesPage />} />
        </Route>

        {/* Member portal */}
        {/* Note: Browse Books is served at /books per specifications */}
        <Route path="/books" element={<MemberShell />}>
          <Route index element={<BrowseBooksPage />} />
        </Route>
        <Route path="/member" element={<MemberShell />}>
          <Route index element={<Navigate to="/books" replace />} />
          <Route path="loans" element={<MyLoansPage />} />
          <Route path="fines" element={<MyFinesPage />} />
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
