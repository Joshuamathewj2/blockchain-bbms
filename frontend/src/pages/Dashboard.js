import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getStats, getInventory, getRequests, getForecast, getExportCsvUrl } from '../utils/api';
import ErrorBanner from '../components/ErrorBanner';

const BG_COLORS = {
  'A+':'#c0392b','A-':'#922b21','B+':'#1a5276','B-':'#154360',
  'AB+':'#784212','AB-':'#515a5a','O+':'#1e8449','O-':'#145a32'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([getStats(), getInventory(), getRequests(), getForecast({ blood_group: 'O+' })])
      .then(([s, inv, req, f]) => {
        setStats(s.data);
        setInventory(inv.data);
        setRequests(req.data);
        setForecast(f.data?.forecast || []);
        setError(null);
      })
      .catch((err) => {
        setError('Could not connect to BloodChain API server.');
        if (process.env.REACT_APP_DEMO_MODE === 'true') {
          setStats({ totalDonors: 248, totalHospitals: 34, availableUnits: 1423, totalRequests: 387, livesSaved: 312 });
          setInventory([
            { blood_group: 'A+', available_units: 312, used_units: 45, expired_units: 3 },
            { blood_group: 'A-', available_units: 87, used_units: 12, expired_units: 1 },
            { blood_group: 'B+', available_units: 245, used_units: 38, expired_units: 2 },
            { blood_group: 'B-', available_units: 43, used_units: 7, expired_units: 0 },
            { blood_group: 'AB+', available_units: 198, used_units: 29, expired_units: 4 },
            { blood_group: 'AB-', available_units: 22, used_units: 4, expired_units: 0 },
            { blood_group: 'O+', available_units: 418, used_units: 67, expired_units: 5 },
            { blood_group: 'O-', available_units: 98, used_units: 18, expired_units: 2 },
          ]);
          setRequests([
            { request_id: '0xreq01', hospital_name: 'Apollo Chennai', blood_group: 'O+', urgency_level: 'CRITICAL', status: 'PENDING', patient_name: 'Patient A', requested_at: new Date().toISOString() },
            { request_id: '0xreq02', hospital_name: 'Fortis Malar', blood_group: 'A+', urgency_level: 'HIGH', status: 'APPROVED', patient_name: 'Patient B', requested_at: new Date(Date.now()-3600000).toISOString() },
          ]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const trendData = [
    { month: 'Jan', donations: 120, requests: 80 },
    { month: 'Feb', donations: 145, requests: 95 },
    { month: 'Mar', donations: 132, requests: 110 },
    { month: 'Apr', donations: 180, requests: 130 },
    { month: 'May', donations: 210, requests: 145 },
    { month: 'Jun', donations: 195, requests: 160 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: '#070d17', border: '1px solid #1a2840', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
          <div style={{ color: '#8899b0', marginBottom: 4 }}>{label}</div>
          {payload.map(p => (
            <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="loading"><div className="spinner" />Syncing with blockchain...</div>;

  const pieData = inventory.map(i => ({ name: i.blood_group, value: i.available_units || 0 }));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title">🩸 BloodChain <span>Dashboard</span></div>
          <div className="page-sub">Real-time blood bank analytics secured on Ethereum blockchain</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={getExportCsvUrl()} download className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
            📊 Export CSV
          </a>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={loadData} />

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Donors', value: stats?.totalDonors || 0, icon: '👤', cls: '' },
          { label: 'Available Units', value: stats?.availableUnits || 0, icon: '🩸', cls: 'red' },
          { label: 'Hospitals', value: stats?.totalHospitals || 0, icon: '🏥', cls: 'cyan' },
          { label: 'Requests', value: stats?.totalRequests || 0, icon: '📋', cls: '' },
          { label: 'Lives Saved', value: stats?.livesSaved || 0, icon: '❤️', cls: 'green' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value.toLocaleString()}</div>
            <div className="stat-icon">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Donation vs Request Trend</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis dataKey="month" tick={{ fill: '#445566', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#445566', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="donations" stroke="#c0392b" strokeWidth={2} dot={{ fill: '#c0392b', r: 3 }} name="Donations" />
              <Line type="monotone" dataKey="requests" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} name="Requests" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Blood Group Distribution</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                {pieData.map((e, i) => <Cell key={i} fill={Object.values(BG_COLORS)[i] || '#c0392b'} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Demand Forecast (Feature 6) */}
      {forecast.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">🤖 AI-Powered 30-Day Demand & Shortage Forecast</div>
            <span className="badge badge-warn">Predictive Model Active</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={forecast}>
              <XAxis dataKey="day" tick={{ fill: '#445566', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#445566', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="predictedDemand" fill="#e74c3c" name="Predicted Demand" radius={[4, 4, 0, 0]} />
              <Bar dataKey="predictedSupply" fill="#00c97a" name="Predicted Supply" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Live Inventory Quick View */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Live Blood Inventory</div>
          <a href="/inventory" className="btn btn-outline btn-sm">View All →</a>
        </div>
        <div className="inventory-grid">
          {inventory.map(inv => {
            const total = (inv.available_units || 0) + (inv.used_units || 0);
            const pct = total > 0 ? Math.round(((inv.available_units || 0) / total) * 100) : 0;
            const cls = pct < 20 ? 'critical' : pct < 40 ? 'low' : '';
            return (
              <div className="inv-card" key={inv.blood_group}>
                <div className="inv-bg">{inv.blood_group}</div>
                <div className="inv-count">{inv.available_units || 0}</div>
                <div className="inv-label">AVAILABLE UNITS</div>
                <div className="inv-bar">
                  <div className={`inv-fill ${cls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
