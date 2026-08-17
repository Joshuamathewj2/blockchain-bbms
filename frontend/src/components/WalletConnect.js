import React from 'react';
import { useWallet } from '../context/WalletContext';

export default function WalletConnect() {
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet, hasMetaMask, chainId, error } = useWallet();

  if (!hasMetaMask) {
    return (
      <div className="wallet-badge warning" title="Install MetaMask for decentralized transaction signing">
        <span className="wallet-dot" style={{ background: '#f0a500' }}></span>
        <span className="wallet-addr">No MetaMask</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {chainId && chainId !== 1337 && chainId !== 31337 && (
          <span style={{ fontSize: 11, background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', padding: '4px 8px', borderRadius: 4, border: '1px solid #e74c3c' }}>
            Wrong Network ({chainId})
          </span>
        )}
        <div className="wallet-badge connected" onClick={disconnectWallet} style={{ cursor: 'pointer' }} title="Click to disconnect wallet">
          <span className="wallet-dot" style={{ background: '#00c97a' }}></span>
          <span className="wallet-addr">{account.slice(0, 6)}...{account.slice(-4)}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      className="btn btn-primary btn-sm"
      onClick={connectWallet}
      disabled={isConnecting}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span style={{ fontSize: 14 }}>🦊</span>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
