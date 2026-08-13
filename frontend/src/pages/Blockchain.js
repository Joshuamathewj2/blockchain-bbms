import React, { useState, useEffect } from 'react';
import { getTransactions } from '../utils/api';
import ErrorBanner from '../components/ErrorBanner';

const TYPE_COLORS = {
  REGISTER_DONOR: '#00c97a',
  DONATE_BLOOD: '#c0392b',
  REQUEST_BLOOD: '#f0a500',
  APPROVE_REQUEST: '#00d4ff',
  REJECT_REQUEST: '#e74c3c',
  REGISTER_HOSPITAL: '#9b59b6',
  VERIFY_HOSPITAL: '#2ecc71',
};

export default function Blockchain() {
  const [txs, setTxs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTxs = (page = 1) => {
    setLoading(true);
    getTransactions({ page, limit: 10 })
      .then(res => {
        if (res.data && res.data.data) {
          setTxs(res.data.data);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: res.data.data.length, pages: 1 });
        } else {
          setTxs(res.data || []);
        }
        setError(null);
      })
      .catch((err) => {
        setError('Could not connect to blockchain transaction indexer.');
        if (process.env.REACT_APP_DEMO_MODE === 'true') {
          setTxs([
            { id: 1, tx_hash: '0x3f8a9c2e1b4d7f6a0e5c8b3d2a1f9e7c4b6d5a8e3f2c1b9a7d6e5f4c3b2a1d', tx_type: 'REGISTER_DONOR', from_address: '0xaaaa000000000000000000000000000000000001', status: 'SUCCESS', gas_used: 154283, block_number: 18394021, created_at: new Date().toISOString() },
            { id: 2, tx_hash: '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', tx_type: 'DONATE_BLOOD', from_address: '0xaaaa000000000000000000000000000000000001', status: 'SUCCESS', gas_used: 98741, block_number: 18394025, created_at: new Date(Date.now() - 600000).toISOString() },
            { id: 3, tx_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a', tx_type: 'REQUEST_BLOOD', from_address: '0xbbbb000000000000000000000000000000000001', status: 'SUCCESS', gas_used: 112056, block_number: 18394030, created_at: new Date(Date.now() - 1200000).toISOString() },
          ]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTxs(1);
  }, []);

  const stats = [
    { label: 'Total Transactions', value: pagination.total || txs.length, cls: 'cyan' },
    { label: 'Successful', value: txs.filter(t => t.status === 'SUCCESS').length, cls: 'green' },
    { label: 'Network', value: 'Ganache / Hardhat', cls: '' },
    { label: 'Chain ID', value: '1337', cls: '' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">⬢ <span>Chain</span> Ledger</div>
        <div className="page-sub">Immutable blockchain transaction history synced with Ethereum network</div>
      </div>

      <ErrorBanner message={error} onRetry={() => fetchTxs(pagination.page)} />

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Transaction log */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Live On-Chain Transaction Log</div>
          <span className="badge badge-cyan">Real-Time Sync</span>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Fetching transaction ledger...</div>
        ) : (
          <div>
            <div className="table-wrap tx-log">
              <table>
                <thead>
                  <tr>
                    <th>Block</th><th>TX Hash</th><th>Type</th>
                    <th>From</th><th>Gas Used</th><th>Status</th><th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => (
                    <tr key={tx.id || tx.tx_hash}>
                      <td style={{ color: '#8899b0' }}>#{tx.block_number ? tx.block_number.toLocaleString() : 'Pending'}</td>
                      <td className="tx-hash">
                        {(tx.tx_hash || '').slice(0, 18)}...
                      </td>
                      <td>
                        <span style={{
                          color: TYPE_COLORS[tx.tx_type] || '#8899b0',
                          fontFamily: 'Space Mono', fontSize: 11,
                          background: `${TYPE_COLORS[tx.tx_type] || '#8899b0'}18`,
                          padding: '2px 6px', borderRadius: 4,
                        }}>
                          {tx.tx_type}
                        </span>
                      </td>
                      <td style={{ color: '#8899b0', fontSize: 11 }}>
                        {(tx.from_address || '').slice(0, 14)}...
                      </td>
                      <td style={{ color: '#8899b0' }}>{tx.gas_used ? tx.gas_used.toLocaleString() : '—'}</td>
                      <td>
                        <span className={`badge ${tx.status === 'SUCCESS' ? 'badge-green' : tx.status === 'FAILED' ? 'badge-red' : 'badge-warn'}`}>
                          {tx.status || 'SUCCESS'}
                        </span>
                      </td>
                      <td style={{ color: '#445566', fontSize: 11 }}>
                        {new Date(tx.created_at || Date.now()).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {txs.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">⛓</div>
                  No on-chain transactions logged yet
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #1a2840' }}>
                <span style={{ fontSize: 12, color: '#8899b0' }}>
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total transactions)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchTxs(pagination.page - 1)}
                  >
                    ← Previous
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchTxs(pagination.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
