import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from './components/Toast';
import { MembersProvider } from './components/MembersContext';
import './index.css';
import './tailwind.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <MembersProvider>
      <App />
    </MembersProvider>
  </ToastProvider>
);
