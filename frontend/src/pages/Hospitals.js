import React, { useState, useEffect } from 'react';
import { getHospitals, registerHospital, verifyHospital } from '../utils/api';

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState({
    wallet_address: '', name: '', registration_number: '', location: '', contact: '', email: ''
  });

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const load = () => {
    getHospitals()
      .then(r => setHospitals(r.data))
      .catch(() => setHospitals([
        { id: 1, wallet_address: '0xbbbb...0001', name: 'Apollo Hospital Chennai', registration_number: 'APCH-2024', location: 'Greams Road, Chennai', is_verified: true, total_requests: 45, total_received: 38 },
        { id: 2, wallet_address: '0xbbbb...0002', name: 'Fortis Malar Hospital', registration_number: 'FMCH-2024', location: 'Adyar, Chennai', is_verified: true, total_requests: 29, total_received: 25 },
        { id: 3, wallet_address: '0xbbbb...0003', name: 'MIOT Hospital', registration_number: 'MIOT-2024', location: 'Manapakkam, Chennai', is_verified: false, total_requests: 10, total_received: 0 },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async () => {
    if (!form.wallet_address || !form.name) return addToast('Fill required fields', 'error');
    setSubmitting(true);
    try {
      await registerHospital(form);
      addToast('Hospital registered! Awaiting admin verification.');
      setShowModal(false);
      setForm({ wallet_address: '', name: '', registration_number: '', location: '', contact: '', email: '' });
      load();
    } catch (e) {
      addToast('Registration failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleVerify = async (wallet) => {
    try {
      await verifyHospital(wallet);
      addToast('Hospital verified on blockchain!');
      load();
    } catch (e) { addToast('Verification failed', 'error'); }
  };

  return (
    <div>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : '❌'}</span>{t.msg}
          </div>
        ))}
      </div>

      <div className="page-header">
        <div className="page-title">✦ <span>Hospital</span> Network</div>
        <div className="page-sub">Verified healthcare institutions on the BloodChain network</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Register Hospital</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Registered Hospitals ({hospitals.length})</div>
          <span className="badge badge-cyan">Smart Contract Verified</span>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Loading hospitals...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Wallet</th><th>Name</th><th>Reg. No</th>
                  <th>Location</th><th>Requests</th><th>Received</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ color: '#445566', fontFamily: 'Space Mono', fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#00d4ff' }}>
                      {(h.wallet_address || '').slice(0, 10)}...
                    </td>
                    <td><strong>{h.name}</strong></td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{h.registration_number || '—'}</td>
                    <td>{h.location || '—'}</td>
                    <td style={{ fontFamily: 'Space Mono', color: '#c0392b' }}>{h.total_requests || 0}</td>
                    <td style={{ fontFamily: 'Space Mono', color: '#00c97a' }}>{h.total_received || 0}</td>
                    <td>
                      <span className={`badge ${h.is_verified ? 'badge-green' : 'badge-warn'}`}>
                        {h.is_verified ? '✓ VERIFIED' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      {!h.is_verified && (
                        <button className="btn btn-success btn-sm" onClick={() => handleVerify(h.wallet_address)}>
                          ⛓ Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hospitals.length === 0 && (
              <div className="empty"><div className="empty-icon">🏥</div>No hospitals registered</div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🏥 Register Hospital</div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Wallet Address *</label>
                <input placeholder="0x..." value={form.wallet_address}
                  onChange={e => setForm({ ...form, wallet_address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hospital Name *</label>
                <input placeholder="Apollo Hospital" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Registration Number</label>
                <input placeholder="REG-2024" value={form.registration_number}
                  onChange={e => setForm({ ...form, registration_number: e.target.value })} />
              </div>
              <div className="form-group full">
                <label>Location</label>
                <input placeholder="City, State" value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Contact</label>
                <input placeholder="+91 XXXXX" value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="admin@hospital.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={submitting}>
                {submitting ? 'Registering...' : '⛓ Register on Chain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
