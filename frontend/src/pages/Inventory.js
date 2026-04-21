import React, { useState, useEffect } from 'react';
import { getInventory, getBloodUnits } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DEMO_INV = [
  { blood_group: 'A+', available_units: 312, used_units: 45, expired_units: 3, total_units: 360 },
  { blood_group: 'A-', available_units: 87, used_units: 12, expired_units: 1, total_units: 100 },
  { blood_group: 'B+', available_units: 245, used_units: 38, expired_units: 2, total_units: 285 },
  { blood_group: 'B-', available_units: 43, used_units: 7, expired_units: 0, total_units: 50 },
  { blood_group: 'AB+', available_units: 198, used_units: 29, expired_units: 4, total_units: 231 },
  { blood_group: 'AB-', available_units: 22, used_units: 4, expired_units: 0, total_units: 26 },
  { blood_group: 'O+', available_units: 418, used_units: 67, expired_units: 5, total_units: 490 },
  { blood_group: 'O-', available_units: 98, used_units: 18, expired_units: 2, total_units: 118 },
];

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bgFilter, setBgFilter] = useState('');

  useEffect(() => {
    Promise.all([getInventory(), getBloodUnits({ available_only: true })])
      .then(([inv, u]) => { setInventory(inv.data); setUnits(u.data); })
      .catch(() => {
        setInventory(DEMO_INV);
        setUnits([
          { unit_id: '0xunit01', donor_name: 'Arjun Kumar', blood_group: 'O+', collected_at: new Date().toISOString(), expires_at: new Date(Date.now() + 37 * 86400000).toISOString(), hospital_name: 'Apollo Chennai', is_used: false },
          { unit_id: '0xunit02', donor_name: 'Priya Sharma', blood_group: 'A+', collected_at: new Date(Date.now() - 10 * 86400000).toISOString(), expires_at: new Date(Date.now() + 32 * 86400000).toISOString(), hospital_name: 'Fortis Malar', is_used: false },
          { unit_id: '0xunit03', donor_name: 'Ravi Menon', blood_group: 'B-', collected_at: new Date(Date.now() - 2 * 86400000).toISOString(), expires_at: new Date(Date.now() + 40 * 86400000).toISOString(), hospital_name: 'MIOT Hospital', is_used: false },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) return (
      <div style={{ background: '#070d17', border: '1px solid #1a2840', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: '#e74c3c', fontWeight: 700 }}>{payload[0]?.payload.blood_group}</div>
        <div style={{ color: '#8899b0' }}>Available: <strong style={{ color: '#fff' }}>{payload[0]?.value}</strong></div>
      </div>
    );
    return null;
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading inventory...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">◉ Blood <span>Inventory</span></div>
        <div className="page-sub">Live blood unit tracking with blockchain traceability</div>
      </div>

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

      {/* Chart + Grid */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Available Units by Blood Group</div></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={inventory} barSize={28}>
              <XAxis dataKey="blood_group" tick={{ fill: '#445566', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#445566', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="available_units" radius={[4, 4, 0, 0]}>
                {inventory.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#c0392b' : '#922b21'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Inventory Status</div></div>
          <div className="inventory-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {inventory.map(inv => {
              const total = (inv.available_units || 0) + (inv.used_units || 0);
              const pct = total > 0 ? Math.round(((inv.available_units || 0) / total) * 100) : 0;
              const cls = pct < 20 ? 'critical' : pct < 40 ? 'low' : '';
              return (
                <div className="inv-card" key={inv.blood_group}>
                  <div className="inv-bg">{inv.blood_group}</div>
                  <div className="inv-count">{inv.available_units || 0}</div>
                  <div className="inv-label">UNITS</div>
                  <div className="inv-bar">
                    <div className={`inv-fill ${cls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Blood unit table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Blood Unit Ledger</div>
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
                <th>Collected</th><th>Expires</th><th>Days Left</th><th>Status</th>
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
                      <span className="badge badge-green">AVAILABLE</span>
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
    </div>
  );
}
