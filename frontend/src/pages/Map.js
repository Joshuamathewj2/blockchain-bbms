import React, { useState, useEffect } from 'react';
import { getHospitals, getDonors } from '../utils/api';
import ErrorBanner from '../components/ErrorBanner';

export default function MapPage() {
  const [hospitals, setHospitals] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  useEffect(() => {
    Promise.all([getHospitals(), getDonors()])
      .then(([hRes, dRes]) => {
        setHospitals(hRes.data || []);
        setDonors(dRes.data || []);
        setError(null);
      })
      .catch((err) => {
        setError('Could not fetch geolocation data from server.');
        setHospitals([
          { id: 1, name: 'Apollo Hospital Chennai', location: 'Greams Road, Chennai', total_requests: 45, lat: 13.0604, lng: 80.2496, is_verified: true },
          { id: 2, name: 'Fortis Malar Hospital', location: 'Adyar, Chennai', total_requests: 29, lat: 13.0067, lng: 80.2570, is_verified: true },
          { id: 3, name: 'MIOT Hospital', location: 'Manapakkam, Chennai', total_requests: 10, lat: 13.0232, lng: 80.1873, is_verified: false },
        ]);
        setDonors([
          { id: 1, name: 'Arjun Kumar', blood_group: 'O+', location: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
          { id: 2, name: 'Priya Sharma', blood_group: 'A+', location: 'Adyar', lat: 13.0012, lng: 80.2565 },
          { id: 3, name: 'Ravi Menon', blood_group: 'B-', location: 'Guindy', lat: 13.0067, lng: 80.2020 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🗺️ <span>Geo-Matching</span> Map</div>
        <div className="page-sub">Visualize hospital density, critical requests, and nearby available donor pools</div>
      </div>

      <ErrorBanner message={error} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Regional Supply & Hospital Network Map (Chennai Region)</div>
          <span className="badge badge-cyan">Live Coordinates</span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading Map Visualizations...</div>
        ) : (
          <div style={{ position: 'relative', height: 450, background: '#070d17', borderRadius: 8, overflow: 'hidden', border: '1px solid #1a2840' }}>
            {/* Interactive Simulated Vector Map Grid */}
            <div style={{
              width: '100%',
              height: '100%',
              backgroundImage: 'radial-gradient(#1a2840 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Map grid labels */}
              <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 11, color: '#445566', fontFamily: 'Space Mono' }}>
                LAT: 13.0827° N | LNG: 80.2707° E
              </div>

              {/* Hospital Markers */}
              {hospitals.map((h, i) => {
                const offsetX = (i * 120) % 360 - 180;
                const offsetY = (i * 80) % 240 - 120;
                return (
                  <div
                    key={h.id || i}
                    onClick={() => setSelectedHospital(h)}
                    style={{
                      position: 'absolute',
                      transform: `translate(${offsetX}px, ${offsetY}px)`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      zIndex: 10,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: 'rgba(231, 76, 60, 0.2)',
                      border: '2px solid #e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto', fontSize: 18, boxShadow: '0 0 12px rgba(231, 76, 60, 0.6)'
                    }}>
                      🏥
                    </div>
                    <div style={{
                      background: '#0d1929', padding: '2px 8px', borderRadius: 4, border: '1px solid #1a2840',
                      fontSize: 10, color: '#fff', marginTop: 4, whiteSpace: 'nowrap', fontWeight: 600
                    }}>
                      {h.name}
                    </div>
                  </div>
                );
              })}

              {/* Donor Pool Clusters */}
              {donors.map((d, i) => {
                const offsetX = ((i + 1) * 90) % 320 - 160;
                const offsetY = ((i + 2) * 70) % 220 - 110;
                return (
                  <div
                    key={d.id || i}
                    style={{
                      position: 'absolute',
                      transform: `translate(${offsetX}px, ${offsetY}px)`,
                      textAlign: 'center',
                      opacity: 0.85,
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'rgba(0, 212, 255, 0.15)',
                      border: '1px dashed #00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto', fontSize: 12, color: '#00d4ff', fontWeight: 700
                    }}>
                      {d.blood_group}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Info Drawer */}
            {selectedHospital && (
              <div style={{
                position: 'absolute', bottom: 16, left: 16, right: 16, background: '#091322',
                border: '1px solid #00d4ff', padding: 14, borderRadius: 8, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>🏥 {selectedHospital.name}</div>
                  <div style={{ fontSize: 12, color: '#8899b0', marginTop: 2 }}>
                    Location: {selectedHospital.location || 'Chennai Central'} | Total Requests: {selectedHospital.total_requests || 0}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedHospital(null)}>Close</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
