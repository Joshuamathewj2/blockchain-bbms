import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Donors from './pages/Donors';
import Hospitals from './pages/Hospitals';
import Inventory from './pages/Inventory';
import Requests from './pages/Requests';
import Blockchain from './pages/Blockchain';
import './App.css';

function Sidebar({ open, setOpen }) {
  const location = useLocation();
  const links = [
    { to: '/', label: 'Dashboard', icon: '⬡' },
    { to: '/donors', label: 'Donors', icon: '◈' },
    { to: '/hospitals', label: 'Hospitals', icon: '✦' },
    { to: '/inventory', label: 'Inventory', icon: '◉' },
    { to: '/requests', label: 'Requests', icon: '◌' },
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
        <div className="chain-status"><span className="dot"></span>Ethereum Testnet</div>
        <div className="chain-id">Chain ID: 1337</div>
      </div>
    </aside>
  );
}

function Header({ setOpen }) {
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={() => setOpen(p => !p)}>☰</button>
      <div className="topbar-right">
        <div className="wallet-badge">
          <span className="wallet-dot"></span>
          <span className="wallet-addr">0x8f2a...3b91</span>
        </div>
        <div className="admin-badge">ADMIN</div>
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
            <Route path="/blockchain" element={<Blockchain />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
