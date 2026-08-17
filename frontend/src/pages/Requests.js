import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { getRequests, createRequest, syncRequest, approveRequest, rejectRequest } from '../utils/api';
import ErrorBanner from '../components/ErrorBanner';
import BloodBankABI from '../utils/BloodBankABI.json';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BG_MAP = { 'A+': 0, 'A-': 1, 'B+': 2, 'B-': 3, 'AB+': 4, 'AB-': 5, 'O+': 6, 'O-': 7 };

export default function Requests() {
  const { account, getSigner, isConnected } = useWallet();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    setLoading(true);
    getRequests()
      .then(r => {
        setRequests(r.data);
        setError(null);
      })
      .catch((err) => {
        setError('Could not fetch blood requests from server.');
        if (process.env.REACT_APP_DEMO_MODE === 'true') {
          setRequests([
            { request_id: '0xreq01abcdef', requester_wallet: '0xbbbb...0001', hospital_name: 'Apollo Chennai', blood_group: 'O+', units_required: 2, patient_name: 'Patient A', urgency_level: 'CRITICAL', status: 'PENDING', requested_at: new Date().toISOString() },
            { request_id: '0xreq02abcdef', requester_wallet: '0xbbbb...0002', hospital_name: 'Fortis Malar', blood_group: 'A+', units_required: 1, patient_name: 'Patient B', urgency_level: 'HIGH', status: 'APPROVED', requested_at: new Date(Date.now() - 3600000).toISOString() },
            { request_id: '0xreq03abcdef', requester_wallet: '0xbbbb...0001', hospital_name: 'Apollo Chennai', blood_group: 'B-', units_required: 1, patient_name: 'Patient C', urgency_level: 'NORMAL', status: 'PENDING', requested_at: new Date(Date.now() - 7200000).toISOString() },
          ]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (account && !form.requester_wallet) {
      setForm(f => ({ ...f, requester_wallet: account }));
    }
  }, [account]);

  const handleCreate = async () => {
    if (!form.requester_wallet || !form.blood_group) return addToast('Fill required fields', 'error');
    setSubmitting(true);
    let txHash = null;

    try {
      if (isConnected && BloodBankABI.address) {
        try {
          const signer = await getSigner();
          if (signer) {
            const contract = new ethers.Contract(BloodBankABI.address, BloodBankABI.abi, signer);
            const tx = await contract.requestBlood(
              BG_MAP[form.blood_group],
              parseInt(form.units_required),
              form.patient_name || '',
              form.urgency_level || 'NORMAL'
            );
            addToast('Request tx submitted to MetaMask. Confirming...');
            await tx.wait();
            txHash = tx.hash;
            addToast(`Request recorded on-chain! TX: ${txHash.slice(0, 10)}...`);
          }
        } catch (bcErr) {
          console.warn('Blockchain execution warning:', bcErr);
        }
      }

      await syncRequest({ ...form, txHash });
      addToast('Blood request submitted successfully!');
      setShowModal(false);
      setForm({ requester_wallet: account || '', hospital_name: '', blood_group: 'A+', units_required: 1, patient_name: '', urgency_level: 'NORMAL' });
      load();
    } catch (e) {
      addToast('Submission failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleApprove = async (id) => {
    try {
      await approveRequest(id);
      addToast('Request approved! Blood units allocated.');
      load();
    } catch (e) {
      addToast(e.response?.data?.error || 'Approval failed (Admin token required)', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRequest(id, 'Admin rejected');
      addToast('Request rejected.', 'info');
      load();
    } catch (e) {
      addToast(e.response?.data?.error || 'Rejection failed (Admin token required)', 'error');
    }
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

      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
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
                {isConnected && (
                  <span style={{ fontSize: 11, color: '#00c97a', marginTop: 4 }}>
                    Connected to MetaMask ({account.slice(0, 6)}...{account.slice(-4)})
                  </span>
                )}
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
                {submitting ? 'Submitting...' : isConnected ? '🦊 Sign & Request via MetaMask' : '⛓ Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
