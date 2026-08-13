import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await loginAdmin({ username, password });
      if (res.data && res.data.token) {
        localStorage.setItem('bloodchain_token', res.data.token);
        localStorage.setItem('bloodchain_role', res.data.role || 'admin');
        navigate('/');
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: 24, background: '#091322', borderRadius: 12, border: '1px solid #1a2840' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 40 }}>🩸</span>
        <h2 style={{ color: '#fff', margin: '8px 0 4px' }}>Admin Portal</h2>
        <p style={{ color: '#8899b0', fontSize: 13 }}>Authenticate to approve requests & verify hospitals</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#8899b0', fontSize: 12, marginBottom: 6 }}>Username / Address</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#8899b0', fontSize: 12, marginBottom: 6 }}>Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Authenticating...' : '🔓 Login to Admin Portal'}
        </button>
      </form>
    </div>
  );
}
