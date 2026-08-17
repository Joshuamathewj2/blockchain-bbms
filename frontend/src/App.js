import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import WalletConnect from './components/WalletConnect';
import Dashboard from './pages/Dashboard';
import Donors from './pages/Donors';
import Hospitals from './pages/Hospitals';
import Inventory from './pages/Inventory';
import Requests from './pages/Requests';
import Blockchain from './pages/Blockchain';
import Login from './pages/Login';
import Map from './pages/Map';
import './App.css';

function Sidebar({ open, setOpen }) {
  const links = [
    { to: '/', label: 'Dashboard', icon: '⬡' },
    { to: '/donors', label: 'Donors', icon: '◈' },
    { to: '/hospitals', label: 'Hospitals', icon: '✦' },
    { to: '/inventory', label: 'Inventory', icon: '◉' },
    { to: '/requests', label: 'Requests', icon: '◌' },
    { to: '/map', label: 'Geo-Map', icon: '🗺️' },
    { to: '/blockchain', label: 'Chain Log', icon: '⬢' },
  ];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <span className="logo-drop">🩸</span>
        <div>
          <div className="logo-title">BLOOD<span>CHAIN</span></div>
          <div className="logo-sub">Decentralized Blood Bank</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-chain">
        <div className="chain-label">NETWORK</div>
        <div className="chain-status"><span className="dot"></span>Ethereum Local / Ganache</div>
        <div className="chain-id">Chain ID: 1337</div>
      </div>
    </aside>
  );
}

function Header({ setOpen }) {
  const token = localStorage.getItem('bloodchain_token');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('bloodchain_token');
    localStorage.removeItem('bloodchain_role');
    navigate('/login');
  };

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={() => setOpen(p => !p)}>☰</button>
      <div className="topbar-right">
        <WalletConnect />
        {token ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="admin-badge">ADMIN</div>
            <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ fontSize: 11, padding: '4px 8px' }}>
              Logout
            </button>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')} style={{ fontSize: 11, padding: '4px 8px' }}>
            Admin Login
          </button>
        )}
      </div>
    </header>
  );
}

function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={open} setOpen={setOpen} />
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <Header setOpen={setOpen} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/donors" element={<Donors />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/map" element={<Map />} />
            <Route path="/blockchain" element={<Blockchain />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </WalletProvider>
  );
}
