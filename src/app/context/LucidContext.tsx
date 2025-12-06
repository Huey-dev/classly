'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { LucidEvolution } from '@lucid-evolution/lucid';

const STORAGE_KEY = 'classly_dev_wallet_seed';

interface LucidContextType {
  lucid: LucidEvolution | null;
  address: string | null;
  balance: number;
  seedPhrase: string | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  connectWallet: (walletName: string) => Promise<void>;
  connectWithSeed: (seed?: string) => Promise<void>;
  disconnect: () => void;
  resetWallet: () => void;
  refreshBalance: () => Promise<void>;
}

const LucidContext = createContext<LucidContextType>({
  lucid: null,
  address: null,
  balance: 0,
  seedPhrase: null,
  isConnected: false,
  loading: true,
  error: null,
  connectWallet: async () => { },
  connectWithSeed: async () => { },
  disconnect: () => { },
  resetWallet: () => { },
  refreshBalance: async () => { },
});

export function LucidProvider({ children }: { children: ReactNode }) {
  const [lucid, setLucid] = useState<LucidEvolution | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Lucid on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializeLucid();
    }
  }, []);

  async function initializeLucid() {
    try {
      setLoading(true);
      setError(null);

      const blockfrostKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
      const network = (process.env.NEXT_PUBLIC_NETWORK as 'Preview' | 'Mainnet') || 'Preview';

      if (!blockfrostKey) {
        throw new Error('Blockfrost API key is not configured. Add NEXT_PUBLIC_BLOCKFROST_API_KEY to your .env file.');
      }

      // Dynamically import Lucid (client-side only)
      const { Lucid, Blockfrost, generateSeedPhrase } = await import('@lucid-evolution/lucid');

      const lucidInstance = await Lucid(
        new Blockfrost(
          `https://cardano-${network.toLowerCase()}.blockfrost.io/api/v0`,
          blockfrostKey
        ),
        network
      );

      setLucid(lucidInstance);
      console.log('✅ Lucid initialized successfully on', network);

      // Check for existing seed phrase in localStorage
      const existingSeed = localStorage.getItem(STORAGE_KEY);
      if (existingSeed) {
        // Auto-connect with existing seed
        lucidInstance.selectWallet.fromSeed(existingSeed);
        setSeedPhrase(existingSeed);

        const addr = await lucidInstance.wallet().address();
        setAddress(addr);

        // Fetch balance
        await fetchBalance(lucidInstance);
        console.log('✅ Wallet restored from seed');
      }
    } catch (err: any) {
      console.error('❌ Failed to initialize Lucid:', err);
      setError(err.message || 'Failed to initialize wallet');
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalance(lucidInstance: LucidEvolution) {
    try {
      const utxos = await lucidInstance.wallet().getUtxos();

      if (!utxos || utxos.length === 0) {
        setBalance(0);
        return;
      }

      let total = BigInt(0);
      for (const utxo of utxos) {
        if (utxo?.assets?.lovelace) {
          const lovelaceValue = utxo.assets.lovelace;
          if (typeof lovelaceValue === 'bigint') {
            total += lovelaceValue;
          } else if (typeof lovelaceValue === 'string' || typeof lovelaceValue === 'number') {
            total += BigInt(lovelaceValue);
          }
        }
      }

      setBalance(Number(total) / 1_000_000);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance(0);
    }
  }

  const refreshBalance = useCallback(async () => {
    if (lucid) {
      await fetchBalance(lucid);
    }
  }, [lucid]);

  async function connectWithSeed(providedSeed?: string) {
    if (!lucid) throw new Error('Lucid not initialized');

    try {
      const { generateSeedPhrase } = await import('@lucid-evolution/lucid');

      let seed = providedSeed || localStorage.getItem(STORAGE_KEY);

      if (!seed) {
        // Generate a new seed phrase
        seed = generateSeedPhrase();
        localStorage.setItem(STORAGE_KEY, seed);
        console.log('🆕 New wallet created');
      }

      lucid.selectWallet.fromSeed(seed);
      setSeedPhrase(seed);

      const addr = await lucid.wallet().address();
      setAddress(addr);

      await fetchBalance(lucid);
      console.log('✅ Wallet connected with seed');
    } catch (err: any) {
      console.error('Failed to connect with seed:', err);
      throw err;
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
      lucid.selectWallet.fromAPI(api);

      const addr = await lucid.wallet().address();
      setAddress(addr);

      await fetchBalance(lucid);

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
    setSeedPhrase(null);
    setBalance(0);
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('walletAddress');
    console.log('🔌 Wallet disconnected');
  }

  function resetWallet() {
    localStorage.removeItem(STORAGE_KEY);
    disconnect();
    // Re-initialize to create a new wallet
    if (lucid) {
      connectWithSeed();
    }
  }

  return (
    <LucidContext.Provider
      value={{
        lucid,
        address,
        balance,
        seedPhrase,
        isConnected: !!address,
        loading,
        error,
        connectWallet,
        connectWithSeed,
        disconnect,
        resetWallet,
        refreshBalance,
      }}
    >
      {children}
    </LucidContext.Provider>
  );
}

export const useLucid = () => useContext(LucidContext);