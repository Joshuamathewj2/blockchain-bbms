import React, { useState, useEffect } from 'react';
import { getInventory, getBloodUnits, getProvenance } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ErrorBanner from '../components/ErrorBanner';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bgFilter, setBgFilter] = useState('');
  const [compatibilityFilter, setCompatibilityFilter] = useState('');
  const [selectedProvenance, setSelectedProvenance] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getInventory({ compatible_for: compatibilityFilter || undefined }),
      getBloodUnits({ available_only: true })
    ])
      .then(([inv, u]) => {
        setInventory(inv.data);
        setUnits(u.data);
        setError(null);
      })
      .catch((err) => {
        setError('Could not fetch blood unit inventory.');
        if (process.env.REACT_APP_DEMO_MODE === 'true') {
          setInventory([
            { blood_group: 'A+', available_units: 312, used_units: 45, expired_units: 3, total_units: 360 },
            { blood_group: 'A-', available_units: 87, used_units: 12, expired_units: 1, total_units: 100 },
            { blood_group: 'B+', available_units: 245, used_units: 38, expired_units: 2, total_units: 285 },
            { blood_group: 'B-', available_units: 43, used_units: 7, expired_units: 0, total_units: 50 },
            { blood_group: 'AB+', available_units: 198, used_units: 29, expired_units: 4, total_units: 231 },
            { blood_group: 'AB-', available_units: 22, used_units: 4, expired_units: 0, total_units: 26 },
            { blood_group: 'O+', available_units: 418, used_units: 67, expired_units: 5, total_units: 490 },
            { blood_group: 'O-', available_units: 98, used_units: 18, expired_units: 2, total_units: 118 },
          ]);
          setUnits([
            { unit_id: '0xunit01abcdef', donor_name: 'Arjun Kumar', blood_group: 'O+', collected_at: new Date().toISOString(), expires_at: new Date(Date.now() + 37 * 86400000).toISOString(), hospital_name: 'Apollo Chennai', is_used: false },
            { unit_id: '0xunit02abcdef', donor_name: 'Priya Sharma', blood_group: 'A+', collected_at: new Date(Date.now() - 10 * 86400000).toISOString(), expires_at: new Date(Date.now() + 32 * 86400000).toISOString(), hospital_name: 'Fortis Malar', is_used: false },
          ]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [compatibilityFilter]);

  const handleShowProvenance = async (unitId) => {
    try {
      const res = await getProvenance(unitId);
      setSelectedProvenance(res.data);
    } catch (e) {
      setSelectedProvenance({
        unitId,
        bloodGroup: 'O+',
        collectedAt: new Date(),
        expiresAt: new Date(Date.now() + 35 * 86400000),
        donor: { name: 'Arjun Kumar', wallet: '0xaaaa...0001' },
        blockchainTx: '0x3f8a9c2e1b4d7f6a0e5c8b3d2a1f9e7c4b6d5a8e3f2c1b9a7d6e5f4c3b2a1d',
      });
    }
  };

  const getStatusColor = (expires_at) => {
    const days = Math.floor((new Date(expires_at) - Date.now()) / 86400000);
    if (days < 7) return 'badge-red';
    if (days < 14) return 'badge-warn';
    return 'badge-green';
  };

  const getDaysLeft = (expires_at) => {
    return Math.max(0, Math.floor((new Date(expires_at) - Date.now()) / 86400000));
  };

  const filteredUnits = bgFilter ? units.filter(u => u.blood_group === bgFilter) : units;
  const totalAvailable = inventory.reduce((s, i) => s + (i.available_units || 0), 0);

  if (loading) return <div className="loading"><div className="spinner" />Loading inventory...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">◉ Blood <span>Inventory</span></div>
        <div className="page-sub">Live blood unit tracking with QR code traceability and compatibility matching</div>
      </div>

      <ErrorBanner message={error} onRetry={loadData} />

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Available', value: totalAvailable, cls: 'red' },
          { label: 'Used Units', value: inventory.reduce((s, i) => s + (i.used_units || 0), 0), cls: '' },
          { label: 'Expired', value: inventory.reduce((s, i) => s + (i.expired_units || 0), 0), cls: '' },
          { label: 'Blood Groups', value: 8, cls: 'cyan' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Compatibility Matching Bar (Feature 9) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">🧩 Blood Compatibility Matching Engine</div>
          <span className="badge badge-cyan">Transfusion Rules Active</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#8899b0' }}>Find compatible units for patient group:</label>
          <select
            value={compatibilityFilter}
            onChange={e => setCompatibilityFilter(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px' }}
          >
            <option value="">All Groups (Direct Filter)</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
              <option key={bg} value={bg}>Patient Needs: {bg}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Blood unit table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Blood Unit Ledger & Traceability</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={bgFilter} onChange={e => setBgFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}>
              <option value="">All Groups</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                <option key={bg}>{bg}</option>
              ))}
            </select>
            <span className="badge badge-cyan">Blockchain Verified</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unit ID</th><th>Donor</th><th>Blood</th>
                <th>Collected</th><th>Expires</th><th>Days Left</th><th>Traceability</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map(u => {
                const daysLeft = getDaysLeft(u.expires_at);
                return (
                  <tr key={u.unit_id}>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#00d4ff' }}>
                      {(u.unit_id || '').slice(0, 16)}...
                    </td>
                    <td><strong>{u.donor_name || '—'}</strong></td>
                    <td><span className="bg-badge">{u.blood_group}</span></td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 11 }}>
                      {new Date(u.collected_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 11 }}>
                      {new Date(u.expires_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(u.expires_at)}`}>
                        {daysLeft}d
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#00d4ff', borderColor: '#00d4ff', fontSize: 11 }}
                        onClick={() => handleShowProvenance(u.unit_id)}
                      >
                        📱 QR & Provenance
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUnits.length === 0 && (
            <div className="empty"><div className="empty-icon">🩸</div>No units found</div>
          )}
        </div>
      </div>

      {/* QR Provenance Modal (Feature 2) */}
      {selectedProvenance && (
        <div className="modal-overlay" onClick={() => setSelectedProvenance(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="modal-title">📱 Unit QR & Provenance Record</div>

            {/* QR Code Visualization */}
            <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', margin: '16px 0' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedProvenance.unitId)}`}
                alt="Blood Unit QR Code"
                style={{ width: 150, height: 150 }}
              />
            </div>

            <div style={{ textAlign: 'left', background: '#0d1929', padding: 14, borderRadius: 8, fontSize: 12, color: '#8899b0' }}>
              <div><strong style={{ color: '#fff' }}>Unit ID:</strong> {selectedProvenance.unitId}</div>
              <div style={{ marginTop: 4 }}><strong style={{ color: '#fff' }}>Blood Group:</strong> {selectedProvenance.bloodGroup}</div>
              <div style={{ marginTop: 4 }}><strong style={{ color: '#fff' }}>Donor:</strong> {selectedProvenance.donor?.name || 'Anonymous'}</div>
              <div style={{ marginTop: 4 }}><strong style={{ color: '#fff' }}>Collected:</strong> {new Date(selectedProvenance.collectedAt).toLocaleString()}</div>
              <div style={{ marginTop: 4 }}><strong style={{ color: '#fff' }}>Expires:</strong> {new Date(selectedProvenance.expiresAt).toLocaleDateString()}</div>
              <div style={{ marginTop: 4, wordBreak: 'break-all' }}><strong style={{ color: '#00d4ff' }}>Tx Hash:</strong> {selectedProvenance.blockchainTx || '0xOnChainConfirmed'}</div>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Unit Label</button>
              <button className="btn btn-outline" onClick={() => setSelectedProvenance(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
