import React from 'react';

const iconPaths = {
  books: 'M5 19a2 2 0 0 0 2 2h11a2 2 0 0 1 0 2H7a4 4 0 0 1 -4 -4v-11a4 4 0 0 1 4 -4h11a2 2 0 0 0 0 -2H7a4 4 0 0 0 -4 4v13zM7 7h10v3H7zM7 12h10v3H7z',
  users: 'M8 7a4 4 0 1 1 8 0a4 4 0 0 1 -8 0M4 21a8 8 0 0 1 16 0M16 11h4a2 2 0 0 1 2 2v1a3 3 0 0 1 -3 3h-1',
  clipboardList: 'M9 4h6a2 2 0 0 1 2 2h2a1 1 0 0 1 1 1v14a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2V7a1 1 0 0 1 1 -1h2a2 2 0 0 1 2 -2M9 4a1 1 0 0 0 1 1h4a1 1 0 0 0 1 -1M8 10h8M8 14h8M8 18h5',
  bookmark: 'M6 4a2 2 0 0 0 -2 2v16l8 -5l8 5v-16a2 2 0 0 0 -2 -2z',
  receipt: 'M6 4h12a2 2 0 0 1 2 2v16l-3 -2l-3 2l-3 -2l-3 2l-3 -2l-3 2V6a2 2 0 0 1 2 -2M8 8h8M8 12h8M8 16h5',
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  logout: 'M14 8l4 4l-4 4M18 12H6M10 4H6a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h4',
  search: 'M10 4a6 6 0 1 0 4.472 10.03l4.749 4.748a1 1 0 0 0 1.414 -1.414l-4.748 -4.749A6 6 0 0 0 10 4z',
  plus: 'M12 5v14M5 12h14',
  return: 'M9 14l-4 -4l4 -4M5 10h10a4 4 0 0 1 4 4v6',
  edit: 'M4 20h4l10.5 -10.5a2.121 2.121 0 0 0 -3 -3L5 17v3zM13.5 6.5l3 3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2l1 -13M9 7V4h6v3',
  creditCard: 'M3 8a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2V8zM3 11h18',
  info: 'M12 18h.01M11 10h1v6h1M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0 -16z',
  book: 'M5 19a2 2 0 0 0 2 2h11a2 2 0 0 1 0 2H7a4 4 0 0 1 -4 -4v-11a4 4 0 0 1 4 -4h11a2 2 0 0 0 0 -2H7a4 4 0 0 0 -4 4v13z',
  alert: 'M12 9v4M12 17h.01M10.29 3.86l-8.4 14.51A2 2 0 0 0 3.6 21h16.8a2 2 0 0 0 1.71 -2.63L13.71 3.86a2 2 0 0 0 -3.42 0z',
  chevronRight: 'M9 6l6 6l-6 6',
  chevronDown: 'M6 9l6 6l6 -6',
  arrowLeft: 'M18 12l-4 4l4 -4M14 12H6M10 4H6a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h4',
};

export default function Icon({ name, size = 16, className = '' }) {
  const d = iconPaths[name];
  if (!d) return null;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}