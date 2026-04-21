import React, { useState, useEffect } from 'react';
import { getRequests, createRequest, approveRequest, rejectRequest } from '../utils/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DEMO = [
  { request_id: '0xreq01abcdef', requester_wallet: '0xbbbb...0001', hospital_name: 'Apollo Chennai', blood_group: 'O+', units_required: 2, patient_name: 'Patient A', urgency_level: 'CRITICAL', status: 'PENDING', requested_at: new Date().toISOString() },
  { request_id: '0xreq02abcdef', requester_wallet: '0xbbbb...0002', hospital_name: 'Fortis Malar', blood_group: 'A+', units_required: 1, patient_name: 'Patient B', urgency_level: 'HIGH', status: 'APPROVED', requested_at: new Date(Date.now() - 3600000).toISOString() },
  { request_id: '0xreq03abcdef', requester_wallet: '0xbbbb...0001', hospital_name: 'Apollo Chennai', blood_group: 'B-', units_required: 1, patient_name: 'Patient C', urgency_level: 'NORMAL', status: 'PENDING', requested_at: new Date(Date.now() - 7200000).toISOString() },
  { request_id: '0xreq04abcdef', requester_wallet: '0xbbbb...0003', hospital_name: 'MIOT Hospital', blood_group: 'AB+', units_required: 3, patient_name: 'Patient D', urgency_level: 'CRITICAL', status: 'REJECTED', requested_at: new Date(Date.now() - 86400000).toISOString() },
];

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState({
    requester_wallet: '', hospital_name: '', blood_group: 'A+',
    units_required: 1, patient_name: '', urgency_level: 'NORMAL'
  });

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const load = () => {
    getRequests()
      .then(r => setRequests(r.data))
      .catch(() => setRequests(DEMO))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.requester_wallet || !form.blood_group) return addToast('Fill required fields', 'error');
    setSubmitting(true);
    try {
      await createRequest(form);
      addToast('Blood request submitted on blockchain!');
      setShowModal(false);
      setForm({ requester_wallet: '', hospital_name: '', blood_group: 'A+', units_required: 1, patient_name: '', urgency_level: 'NORMAL' });
      load();
    } catch { addToast('Submission failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id) => {
    try {
      await approveRequest(id);
      addToast('Request approved! Blood units allocated.');
      load();
    } catch { addToast('Approval failed', 'error'); }
  };

  const handleReject = async (id) => {
    try {
      await rejectRequest(id);
      addToast('Request rejected.', 'info');
      load();
    } catch { addToast('Rejection failed', 'error'); }
  };

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <div>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>{t.msg}
          </div>
        ))}
      </div>

      <div className="page-header">
        <div className="page-title">◌ Blood <span>Requests</span></div>
        <div className="page-sub">Hospital blood request management via smart contracts</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setFilter(s)}
            >
              {s} <span style={{ opacity: .7 }}>({counts[s]})</span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Request</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Blood Requests — {filter}</div>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Loading requests...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Hospital</th><th>Patient</th><th>Blood</th>
                  <th>Units</th><th>Urgency</th><th>Status</th><th>Time</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.request_id}>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#00d4ff' }}>
                      {(r.request_id || '').slice(0, 10)}...
                    </td>
                    <td><strong>{r.hospital_name || '—'}</strong></td>
                    <td>{r.patient_name || '—'}</td>
                    <td><span className="bg-badge">{r.blood_group}</span></td>
                    <td style={{ fontFamily: 'Space Mono', fontWeight: 700, color: '#c0392b' }}>
                      {r.units_required}
                    </td>
                    <td>
                      <span className={
                        r.urgency_level === 'CRITICAL' ? 'urg-critical' :
                        r.urgency_level === 'HIGH' ? 'urg-high' : 'urg-normal'
                      }>{r.urgency_level}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        r.status === 'APPROVED' ? 'green' :
                        r.status === 'REJECTED' ? 'red' :
                        r.status === 'FULFILLED' ? 'cyan' : 'warn'
                      }`}>{r.status}</span>
                    </td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 10 }}>
                      {new Date(r.requested_at).toLocaleString()}
                    </td>
                    <td>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-success btn-sm"
                            onClick={() => handleApprove(r.request_id)}>✓</button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleReject(r.request_id)}>✗</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty"><div className="empty-icon">📋</div>No requests found</div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📋 New Blood Request</div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Hospital Wallet Address *</label>
                <input placeholder="0x..." value={form.requester_wallet}
                  onChange={e => setForm({ ...form, requester_wallet: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hospital Name</label>
                <input placeholder="Apollo Hospital" value={form.hospital_name}
                  onChange={e => setForm({ ...form, hospital_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Patient Name</label>
                <input placeholder="Patient Name" value={form.patient_name}
                  onChange={e => setForm({ ...form, patient_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Blood Group *</label>
                <select value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })}>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Units Required *</label>
                <input type="number" min="1" max="10" value={form.units_required}
                  onChange={e => setForm({ ...form, units_required: parseInt(e.target.value) })} />
              </div>
              <div className="form-group full">
                <label>Urgency Level</label>
                <select value={form.urgency_level} onChange={e => setForm({ ...form, urgency_level: e.target.value })}>
                  <option>NORMAL</option><option>HIGH</option><option>CRITICAL</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Submitting...' : '⛓ Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
