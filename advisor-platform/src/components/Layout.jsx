import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <header style={{ padding: '16px 24px', background: '#111827', color: '#fff' }}>
        <strong>Advisor Platform</strong>
        <nav style={{ marginTop: 8 }}>
          <Link to="/dashboard" style={{ color: '#fff', marginRight: 12 }}>
            Dashboard
          </Link>
          <Link to="/performance" style={{ color: '#fff', marginRight: 12 }}>
            Performance
          </Link>
          <Link to="/reports" style={{ color: '#fff' }}>
            Reports
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
