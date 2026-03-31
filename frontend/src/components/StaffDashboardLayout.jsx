import React from 'react';

export default function StaffDashboardLayout({ title, staff, onLogout, links = [], children }) {
  void links;

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e9ecef',
        padding: '1.5rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#6f0022', fontSize: '1.8rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
              {title}
            </h1>
            <p style={{ margin: '0.3rem 0 0', color: '#666', fontSize: '0.95rem' }}>
              {staff ? `${staff.fullName} • ${staff.role}` : 'Loading user...'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <a
              href="/home"
              style={{
                textDecoration: 'none',
                color: '#6f0022',
                border: '1px solid #e6d6dc',
                borderRadius: 999,
                padding: '0.5rem 0.9rem',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Customer Home
            </a>
            <button
              type="button"
              onClick={onLogout}
              style={{
                border: 'none',
                background: '#6f0022',
                color: '#fff',
                borderRadius: 999,
                padding: '0.55rem 1rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem' }}>{children}</main>
    </div>
  );
}
