import React, { useState, useEffect } from 'react';

const DEMO_TXS = [
  { id: 1, tx_hash: '0x3f8a9c2e1b4d7f6a0e5c8b3d2a1f9e7c4b6d5a8e3f2c1b9a7d6e5f4c3b2a1d', tx_type: 'REGISTER_DONOR', from_address: '0xaaaa000000000000000000000000000000000001', status: 'SUCCESS', gas_used: 154283, block_number: 18394021, created_at: new Date().toISOString() },
  { id: 2, tx_hash: '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', tx_type: 'DONATE_BLOOD', from_address: '0xaaaa000000000000000000000000000000000001', status: 'SUCCESS', gas_used: 98741, block_number: 18394025, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 3, tx_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a', tx_type: 'REQUEST_BLOOD', from_address: '0xbbbb000000000000000000000000000000000001', status: 'SUCCESS', gas_used: 112056, block_number: 18394030, created_at: new Date(Date.now() - 1200000).toISOString() },
  { id: 4, tx_hash: '0x4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f', tx_type: 'APPROVE_REQUEST', from_address: '0x8f2a00000000000000000000000000000003b91', status: 'SUCCESS', gas_used: 87230, block_number: 18394035, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 5, tx_hash: '0x7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b', tx_type: 'REGISTER_HOSPITAL', from_address: '0xbbbb000000000000000000000000000000000002', status: 'SUCCESS', gas_used: 134590, block_number: 18394010, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 6, tx_hash: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c', tx_type: 'VERIFY_HOSPITAL', from_address: '0x8f2a00000000000000000000000000000003b91', status: 'SUCCESS', gas_used: 43210, block_number: 18394015, created_at: new Date(Date.now() - 7200000).toISOString() },
];

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setTxs(DEMO_TXS);
      setLoading(false);
    }, 800);
  }, []);

  const stats = [
    { label: 'Total Transactions', value: txs.length, cls: 'cyan' },
    { label: 'Successful', value: txs.filter(t => t.status === 'SUCCESS').length, cls: 'green' },
    { label: 'Current Block', value: '18,394,035', cls: '' },
    { label: 'Chain ID', value: '1337', cls: '' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">⬢ <span>Chain</span> Ledger</div>
        <div className="page-sub">Immutable blockchain transaction history — Ethereum network</div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Network info */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Network Status</div>
          <span className="badge badge-green">● CONNECTED</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontFamily: 'Space Mono', fontSize: 12 }}>
          {[
            { label: 'RPC URL', value: 'http://127.0.0.1:7545' },
            { label: 'Contract', value: '0x8f2a...3b91' },
            { label: 'Network', value: 'Ganache / Hardhat' },
            { label: 'Gas Price', value: '20 Gwei' },
            { label: 'Block Time', value: '~3 seconds' },
            { label: 'Consensus', value: 'PoA (local)' },
          ].map(item => (
            <div key={item.label} style={{ padding: 12, background: '#0d1929', borderRadius: 8 }}>
              <div style={{ color: '#445566', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>{item.label}</div>
              <div style={{ color: '#00d4ff' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction log */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Transaction Log</div>
          <span className="badge badge-cyan">Live</span>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Syncing chain...</div>
        ) : (
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
                  <tr key={tx.id}>
                    <td style={{ color: '#8899b0' }}>#{tx.block_number?.toLocaleString()}</td>
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
                    <td style={{ color: '#8899b0' }}>{tx.gas_used?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${tx.status === 'SUCCESS' ? 'badge-green' : tx.status === 'FAILED' ? 'badge-red' : 'badge-warn'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ color: '#445566', fontSize: 11 }}>
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Smart contract info */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Smart Contract ABI Functions</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { fn: 'registerDonor(name, bloodGroup, age, contact)', type: 'write', gas: '~154k' },
            { fn: 'donateBlood(hospitalName)', type: 'write', gas: '~98k' },
            { fn: 'registerHospital(name, location)', type: 'write', gas: '~134k' },
            { fn: 'requestBlood(bloodGroup, units, patient, urgency)', type: 'write', gas: '~112k' },
            { fn: 'verifyHospital(address)', type: 'admin', gas: '~43k' },
            { fn: 'approveRequest(requestId)', type: 'admin', gas: '~87k' },
            { fn: 'getAvailableUnitsCount(bloodGroup)', type: 'read', gas: '0' },
            { fn: 'getTotalStats()', type: 'read', gas: '0' },
          ].map((f, i) => (
            <div key={i} style={{
              background: '#0d1929', borderRadius: 8, padding: '10px 14px',
              border: '1px solid #1a2840', display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                background: f.type === 'write' ? 'rgba(192,57,43,.2)' : f.type === 'admin' ? 'rgba(0,212,255,.15)' : 'rgba(0,201,122,.15)',
                color: f.type === 'write' ? '#e74c3c' : f.type === 'admin' ? '#00d4ff' : '#00c97a',
                border: `1px solid ${f.type === 'write' ? '#922b21' : f.type === 'admin' ? '#0099bb' : '#00966a'}`,
              }}>
                {f.type.toUpperCase()}
              </span>
              <div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#e0e6f0' }}>{f.fn}</div>
                <div style={{ fontSize: 10, color: '#445566', marginTop: 2 }}>Gas: {f.gas}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
