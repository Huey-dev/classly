// ========================================
// WALLET BUTTON COMPONENT
// src/app/component/WalletButton.tsx
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { 
  loadWalletFromStorage,
  getWalletBalance,
  type WalletInfo 
} from '../lib/wallet-creation';

export function WalletButton() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [showBalanceDropdown, setShowBalanceDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load wallet on mount
  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    setIsLoading(true);
    try {
      const stored = loadWalletFromStorage();
      if (stored) {
        setWalletInfo(stored);
        await loadBalance(stored.address);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalance = async (address: string) => {
    try {
      const { ada } = await getWalletBalance(address);
      setBalance(ada);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleRefresh = async () => {
    if (!walletInfo) return;
    setIsRefreshing(true);
    try {
      await loadBalance(walletInfo.address);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect? Your wallet will still be saved.')) {
      setWalletInfo(null);
      setBalance(0);
      setShowBalanceDropdown(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <button 
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  // Not connected state
  if (!walletInfo) {
    return (
      <a
        href="/wallet"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium inline-block"
      >
        Create Wallet
      </a>
    );
  }

  // Connected state
  return (
    <div className="relative">
      <button
        onClick={() => setShowBalanceDropdown(!showBalanceDropdown)}
        className="flex items-center space-x-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg transition"
      >
        <span className="font-mono text-sm">{formatAddress(walletInfo.address)}</span>
        <span className="font-bold">₳ {balance.toFixed(2)}</span>
      </button>

      {/* Balance Dropdown */}
      {showBalanceDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowBalanceDropdown(false)}
          />
          
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-semibold text-gray-700">Wallet Details</p>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-blue-600 hover:text-blue-700 text-sm disabled:opacity-50"
                >
                  {isRefreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                <p className="text-xs font-mono text-gray-800 break-all bg-gray-50 p-2 rounded">
                  {walletInfo.address}
                </p>
              </div>
              
              <div className="border-t pt-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Balance</p>
                <p className="text-3xl font-bold text-gray-800 mb-1">
                  ₳ {balance.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">
                  {(balance * 1_000_000).toFixed(0)} lovelace
                </p>
              </div>

              <div className="space-y-2">
                <a
                  href="/student"
                  className="block w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-2 px-4 rounded-lg transition"
                  onClick={() => setShowBalanceDropdown(false)}
                >
                  📚 Student Dashboard
                </a>
                
                <a
                  href="/wallet"
                  className="block w-full text-center bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold py-2 px-4 rounded-lg transition"
                  onClick={() => setShowBalanceDropdown(false)}
                >
                  ⚙️ Manage Wallet
                </a>

                <button
                  onClick={handleDisconnect}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}