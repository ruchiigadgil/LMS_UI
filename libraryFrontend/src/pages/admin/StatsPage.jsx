// src/pages/admin/StatsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminHeader } from '../../layouts/AdminShell';
import { getAdminStats, getMembers } from '../../api/api';
import styles from './StatsPage.module.css';

// Slice colors come from the Verso palette. Identity never rides on color
// alone: every slice is listed in the legend with its label and count.
const DONUT_COLORS = ['#6D4C41', '#BCAAA4', '#C62828'];

function Donut({ title, slices }) {
  const [hovered, setHovered] = useState(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const R = 40;
  const STROKE = 16;
  const C = 2 * Math.PI * R;
  const GAP = slices.filter(s => s.value > 0).length > 1 ? 2 : 0;

  let offset = 0;
  const arcs = slices
    .map((s, i) => ({ ...s, color: s.color || DONUT_COLORS[i] }))
    .filter(s => s.value > 0)
    .map(s => {
      const len = (s.value / total) * C;
      const arc = { ...s, dash: Math.max(len - GAP, 0.5), start: offset };
      offset += len;
      return arc;
    });

  const hoveredArc = arcs.find(a => a.label === hovered);

  return (
    <div className={styles.donutCard}>
      <h3 className={styles.listTitle}>{title}</h3>
      <div className={styles.donutBody}>
        <svg viewBox="0 0 100 100" className={styles.donutSvg} role="img" aria-label={title}>
          {arcs.map(a => (
            <circle
              key={a.label}
              cx="50" cy="50" r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hovered === a.label ? STROKE + 4 : STROKE}
              opacity={hovered && hovered !== a.label ? 0.35 : 1}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={-a.start}
              transform="rotate(-90 50 50)"
              className={styles.donutSlice}
              onMouseEnter={() => setHovered(a.label)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {hoveredArc ? (
            <>
              <text x="50" y="48" textAnchor="middle" className={styles.donutCenter}>
                {hoveredArc.value}
              </text>
              <text x="50" y="60" textAnchor="middle" className={styles.donutCenterSub}>
                {Math.round((hoveredArc.value / total) * 100)}%
              </text>
            </>
          ) : (
            <text x="50" y="54" textAnchor="middle" className={styles.donutCenter}>{total}</text>
          )}
        </svg>
        <ul className={styles.donutLegend}>
          {arcs.map(a => (
            <li
              key={a.label}
              className={`${styles.legendItem} ${hovered && hovered !== a.label ? styles.legendDimmed : ''}`}
              onMouseEnter={() => setHovered(a.label)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className={styles.legendSwatch} style={{ background: a.color }} />
              <span className={styles.legendLabel}>{a.label}</span>
              <span className={styles.legendValue}>{a.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const setHeader = useAdminHeader();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHeader({ title: '', action: null });
  }, [setHeader]);

  useEffect(() => {
    function load() {
      // getMembers applies the same client-side deletions the Members page
      // shows, so the tile matches what the admin actually sees there.
      Promise.all([getAdminStats(), getMembers()])
        .then(([data, memberList]) => {
          setStats({ ...data, members: { ...data.members, total: memberList.length } });
          setError(null);
        })
        .catch(err => setError(err.message || 'Failed to load statistics'))
        .finally(() => setLoading(false));
    }
    load();
    // Refresh when the admin returns to this tab/window so the numbers
    // reflect actions taken elsewhere.
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  if (loading) {
    return (
      <div className={styles.stateMsg}>
        <span className="spinner"></span>
        <span>Loading statistics...</span>
      </div>
    );
  }
  if (error) return <div className={styles.stateMsg}>{error}</div>;
  if (!stats) return null;

  const { books, loans, reservations, members, fines, recommendations = [] } = stats;
  const onTime = Math.max(loans.issued - loans.overdue, 0);
  const onShelf = Math.max(books.total_copies - loans.issued, 0);

  const tiles = [
    { label: 'Books Issued', value: loans.issued, hint: `by ${loans.borrowers} member${loans.borrowers !== 1 ? 's' : ''}`, to: '/admin/loans' },
    { label: 'Overdue', value: loans.overdue, alert: loans.overdue > 0, to: '/admin/loans?tab=overdue' },
    { label: 'Pending Requests', value: loans.pending_requests, to: '/admin/loans' },
    { label: 'Waiting in Queue', value: reservations.waiting, to: '/admin/waitlist?status=waiting' },
    { label: 'Ready for Pickup', value: reservations.ready_for_pickup, to: '/admin/waitlist?status=ready' },
    { label: 'Stocked Out', value: books.stocked_out_count, alert: books.stocked_out_count > 0, to: '/admin/books?stock=out' },
    { label: 'Members', value: members.total, to: '/admin/members' },
    { label: 'Unpaid Fines', value: `$${fines.unpaid_total.toFixed(2)}`, hint: `${fines.unpaid_count} fine${fines.unpaid_count !== 1 ? 's' : ''}`, to: '/admin/fines?filter=unpaid' },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Library Insights</h2>
      <p className={styles.collectionLine}>
        Collection: {books.titles} title{books.titles !== 1 ? 's' : ''} &middot; {books.total_copies} copies
      </p>

      <div className={styles.tileGrid}>
        {tiles.map(tile => (
          <button
            key={tile.label}
            type="button"
            className={styles.tile}
            onClick={() => navigate(tile.to)}
            title={`Open ${tile.label}`}
          >
            <span className={`${styles.tileValue} ${tile.alert ? styles.tileValueAlert : ''}`}>
              {tile.value}
            </span>
            <span className={styles.tileLabel}>{tile.label}</span>
            {tile.hint && <span className={styles.tileHint}>{tile.hint}</span>}
          </button>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className={styles.recsCard}>
          <h3 className={styles.listTitle}>Recommendations</h3>
          <ul className={styles.list}>
            {recommendations.map((rec, i) => (
              <li
                key={i}
                className={`${styles.recItem} ${styles['rec_' + rec.priority]}`}
                onClick={() => rec.link && navigate(rec.link)}
                role={rec.link ? 'button' : undefined}
              >
                {rec.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.listRow}>
        <Donut
          title="Loans"
          slices={[
            { label: 'On time', value: onTime, color: '#6D4C41' },
            { label: 'Pending requests', value: loans.pending_requests, color: '#BCAAA4' },
            { label: 'Overdue', value: loans.overdue, color: '#C62828' },
          ]}
        />
        <Donut
          title="Copies"
          slices={[
            { label: 'Issued', value: loans.issued, color: '#6D4C41' },
            { label: 'On shelf', value: onShelf, color: '#BCAAA4' },
          ]}
        />
        <Donut
          title="Reservations"
          slices={[
            { label: 'Waiting', value: reservations.waiting, color: '#6D4C41' },
            { label: 'Ready for pickup', value: reservations.ready_for_pickup, color: '#BCAAA4' },
          ]}
        />
      </div>

      <div className={styles.listRow}>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Stocked Out</h3>
          {books.stocked_out.length === 0 ? (
            <p className={styles.emptyText}>Every title has copies on the shelf.</p>
          ) : (
            <ul className={styles.list}>
              {books.stocked_out.map(b => (
                <li key={b.id} className={styles.listItem}>
                  <span className={styles.listItemTitle}>{b.title}</span>
                  <span className={styles.listItemCount}>
                    all {b.total_copies} out
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Longest Waitlists</h3>
          {reservations.most_waited.length === 0 ? (
            <p className={styles.emptyText}>No one is waiting right now.</p>
          ) : (
            <ul className={styles.list}>
              {reservations.most_waited.map(b => (
                <li key={b.id} className={styles.listItem}>
                  <span className={styles.listItemTitle}>{b.title}</span>
                  <span className={styles.listItemCount}>
                    {b.waiting} waiting
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
