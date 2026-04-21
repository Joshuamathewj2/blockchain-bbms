import React, { useState, useEffect } from 'react';
import { getDonors, registerDonor, donateBlood } from '../utils/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : '❌'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function Donors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    wallet_address: '', name: '', blood_group: 'A+', age: '',
    gender: 'Male', contact: '', email: '', address: ''
  });
  const [donateForm, setDonateForm] = useState({ hospital_name: '' });

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const loadDonors = () => {
    getDonors()
      .then(r => setDonors(r.data))
      .catch(() => setDonors([
        { id: 1, wallet_address: '0xaaaa...0001', name: 'Arjun Kumar', blood_group: 'O+', age: 28, gender: 'Male', total_donations: 3, is_eligible: true, created_at: new Date().toISOString() },
        { id: 2, wallet_address: '0xaaaa...0002', name: 'Priya Sharma', blood_group: 'A+', age: 24, gender: 'Female', total_donations: 1, is_eligible: true, created_at: new Date().toISOString() },
        { id: 3, wallet_address: '0xaaaa...0003', name: 'Ravi Menon', blood_group: 'B-', age: 35, gender: 'Male', total_donations: 5, is_eligible: true, created_at: new Date().toISOString() },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDonors(); }, []);

  const handleRegister = async () => {
    if (!form.wallet_address || !form.name || !form.age) {
      return addToast('Please fill all required fields', 'error');
    }
    setSubmitting(true);
    try {
      const res = await registerDonor(form);
      addToast(`Donor registered! TX: ${res.data.txHash || 'DB saved'}`);
      setShowRegister(false);
      setForm({ wallet_address: '', name: '', blood_group: 'A+', age: '', gender: 'Male', contact: '', email: '', address: '' });
      loadDonors();
    } catch (e) {
      addToast(e.response?.data?.error || 'Registration failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDonate = async () => {
    if (!selectedDonor) return;
    setSubmitting(true);
    try {
      const res = await donateBlood({
        donor_wallet: selectedDonor.wallet_address,
        blood_group: selectedDonor.blood_group,
        hospital_name: donateForm.hospital_name || 'BloodChain Center',
      });
      addToast(`Blood unit recorded! Unit: ${(res.data.unitId || '').slice(0, 14)}...`);
      setShowDonate(false);
      loadDonors();
    } catch (e) {
      addToast('Donation recording failed', 'error');
    } finally { setSubmitting(false); }
  };

  const filtered = donors.filter(d =>
    d.name.toLowerCase().includes(filter.toLowerCase()) ||
    (d.blood_group || '').includes(filter.toUpperCase())
  );

  return (
    <div>
      <Toast toasts={toasts} />
      <div className="page-header">
        <div className="page-title">◈ <span>Donor</span> Registry</div>
        <div className="page-sub">Manage registered blood donors on-chain</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="🔍  Search by name or blood group..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn btn-primary" onClick={() => setShowRegister(true)}>
          + Register Donor
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Registered Donors ({filtered.length})</div>
          <span className="badge badge-cyan">On-Chain Verified</span>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Loading donors...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Wallet</th><th>Name</th><th>Blood</th>
                  <th>Age</th><th>Gender</th><th>Donations</th><th>Eligible</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id}>
                    <td style={{ color: '#445566', fontFamily: 'Space Mono', fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#00d4ff' }}>
                      {(d.wallet_address || '').slice(0, 10)}...
                    </td>
                    <td><strong>{d.name}</strong></td>
                    <td><span className="bg-badge">{d.blood_group}</span></td>
                    <td>{d.age}</td>
                    <td>{d.gender || '—'}</td>
                    <td>
                      <span style={{ fontFamily: 'Space Mono', color: '#c0392b', fontWeight: 700 }}>
                        {d.total_donations || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d.is_eligible ? 'badge-green' : 'badge-red'}`}>
                        {d.is_eligible ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={!d.is_eligible}
                        onClick={() => { setSelectedDonor(d); setShowDonate(true); }}
                      >
                        🩸 Donate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty">
                <div className="empty-icon">👤</div>
                No donors found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🩸 Register New Donor</div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Wallet Address *</label>
                <input placeholder="0x..." value={form.wallet_address}
                  onChange={e => setForm({ ...form, wallet_address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Full Name *</label>
                <input placeholder="John Doe" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Blood Group *</label>
                <select value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })}>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Age *</label>
                <input type="number" min="18" max="65" placeholder="18-65"
                  value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contact</label>
                <input placeholder="+91 XXXXX XXXXX" value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="donor@email.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group full">
                <label>Address</label>
                <input placeholder="City, State" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowRegister(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={submitting}>
                {submitting ? 'Registering...' : '⛓ Register on Blockchain'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donate Modal */}
      {showDonate && selectedDonor && (
        <div className="modal-overlay" onClick={() => setShowDonate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🩸 Record Blood Donation</div>
            <div style={{ background: '#0d1929', borderRadius: 8, padding: '14px', marginBottom: 16 }}>
              <div style={{ color: '#8899b0', fontSize: 12, marginBottom: 6 }}>DONOR DETAILS</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedDonor.name}</div>
              <div style={{ color: '#8899b0', fontSize: 12, marginTop: 4 }}>
                Blood Group: <span className="bg-badge" style={{ display: 'inline' }}>{selectedDonor.blood_group}</span>
                &nbsp;&nbsp;|&nbsp;&nbsp;Total Donations: {selectedDonor.total_donations || 0}
              </div>
            </div>
            <div className="form-group">
              <label>Collection Hospital / Center</label>
              <input placeholder="Apollo Hospital Chennai" value={donateForm.hospital_name}
                onChange={e => setDonateForm({ hospital_name: e.target.value })} />
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#445566', fontFamily: 'Space Mono' }}>
              ℹ️ This will create an immutable blood unit record on Ethereum. Expiry: 42 days.
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDonate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDonate} disabled={submitting}>
                {submitting ? 'Recording...' : '⛓ Record on Chain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
