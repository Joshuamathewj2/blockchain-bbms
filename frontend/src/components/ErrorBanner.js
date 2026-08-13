import React from 'react';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

  return (
    <div style={{
      background: isDemoMode ? 'rgba(240, 165, 0, 0.12)' : 'rgba(231, 76, 60, 0.12)',
      border: `1px solid ${isDemoMode ? '#f0a500' : '#e74c3c'}`,
      color: isDemoMode ? '#f39c12' : '#e74c3c',
      padding: '12px 16px',
      borderRadius: 8,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 13,
      fontFamily: 'Space Mono, monospace'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{isDemoMode ? '⚠️' : '🚨'}</span>
        <div>
          {isDemoMode && <strong>[DEMO MODE ACTIVE] </strong>}
          <span>{message}</span>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-outline btn-sm"
          style={{ borderColor: isDemoMode ? '#f0a500' : '#e74c3c', color: isDemoMode ? '#f39c12' : '#e74c3c' }}
        >
          🔄 Retry
        </button>
      )}
    </div>
  );
}
