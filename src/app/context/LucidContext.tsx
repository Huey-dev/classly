'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LucidEvolution } from '@lucid-evolution/lucid';

interface LucidContextType {
  lucid: LucidEvolution | null;
  address: string | null;
  isConnected: boolean;
  connectWallet: (walletName: string) => Promise<void>;
  disconnect: () => void;
  loading: boolean;
  error: string | null;
}

const LucidContext = createContext<LucidContextType>({
  lucid: null,
  address: null,
  isConnected: false,
  connectWallet: async () => {},
  disconnect: () => {},
  loading: false,
  error: null,
});

export function LucidProvider({ children }: { children: ReactNode }) {
  const [lucid, setLucid] = useState<LucidEvolution | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      initLucid();
    }
  }, []);

  async function initLucid() {
    try {
      // Dynamically import Lucid (client-side only)
      const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
      
      // CORRECT: Lucid Evolution uses Lucid() as a function, not Lucid.new()
      const lucidInstance = await Lucid(
        new Blockfrost(
          'https://cardano-preview.blockfrost.io/api/v0',
          process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
        ),
        'Preview'
      );
      
      setLucid(lucidInstance);
      console.log('✅ Lucid initialized successfully');
    } catch (err: any) {
      console.error('❌ Failed to initialize Lucid:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function connectWallet(walletName: string) {
    if (!lucid) throw new Error('Lucid not initialized');

    try {
      // Check if wallet extension exists
      if (!(window as any).cardano || !(window as any).cardano[walletName]) {
        throw new Error(`${walletName} wallet not found. Please install the extension.`);
      }

      const api = await (window as any).cardano[walletName].enable();
      
      // CORRECT: selectWallet is an object with methods in Lucid Evolution
      lucid.selectWallet.fromAPI(api);
      
      const addr = await lucid.wallet().address();
      setAddress(addr);
      
      localStorage.setItem('connectedWallet', walletName);
      localStorage.setItem('walletAddress', addr);
      
      console.log('✅ Wallet connected:', walletName);
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      throw err;
    }
  }

  function disconnect() {
    setAddress(null);
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('walletAddress');
    console.log('🔌 Wallet disconnected');
  }

  return (
    <LucidContext.Provider
      value={{
        lucid,
        address,
        isConnected: !!address,
        connectWallet,
        disconnect,
        loading,
        error,
      }}
    >
      {children}
    </LucidContext.Provider>
  );
}

export const useLucid = () => useContext(LucidContext);