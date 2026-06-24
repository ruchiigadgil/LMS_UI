import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { MembersProvider } from './components/MembersContext';
import './index.css';

import AdminShell from './layouts/AdminShell';
import MemberShell from './layouts/MemberShell';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

import BooksPage from './pages/admin/BooksPage';
import MembersPage from './pages/admin/MembersPage';
import LoansPage from './pages/admin/LoansPage';
import WaitlistPage from './pages/admin/WaitlistPage';
import FinesPage from './pages/admin/FinesPage';

import BrowseBooksPage from './pages/member/BrowseBooksPage';
import MyLoansPage from './pages/member/MyLoansPage';
import MyFinesPage from './pages/member/MyFinesPage';

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/admin"
          element={(
            <MembersProvider>
              <AdminShell />
            </MembersProvider>
          )}
        >
          <Route index element={<Navigate to="/admin/books" replace />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="waitlist" element={<WaitlistPage />} />
          <Route path="fines" element={<FinesPage />} />
        </Route>

        <Route path="/books" element={<MemberShell />}>
          <Route index element={<BrowseBooksPage />} />
        </Route>

        <Route path="/member" element={<MemberShell />}>
          <Route index element={<Navigate to="/books" replace />} />
          <Route path="loans" element={<MyLoansPage />} />
          <Route path="fines" element={<MyFinesPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);
