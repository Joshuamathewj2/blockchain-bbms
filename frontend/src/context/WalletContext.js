import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const EXPECTED_CHAIN_ID = '0x539'; // 1337 in hex (Ganache/Hardhat)
export const EXPECTED_CHAIN_ID_DECIMAL = 1337;

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));

        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err) {
        console.error('Wallet connection check error:', err);
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setError(null);
        } else {
          setAccount(null);
        }
      };

      const handleChainChanged = (newChainId) => {
        setChainId(parseInt(newChainId, 16));
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [checkConnection]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask browser extension.');
      return null;
    }

    setIsConnecting(true);
    setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnecting(false);
        return accounts[0];
      }
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
    return null;
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  const getSigner = async () => {
    if (!window.ethereum || !account) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    return await provider.getSigner();
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
        getSigner,
        isConnected: !!account,
        hasMetaMask: typeof window !== 'undefined' && !!window.ethereum,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
