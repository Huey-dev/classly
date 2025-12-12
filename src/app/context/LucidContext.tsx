"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  LucidEvolution,
  Lucid as LucidInstance,
} from "@lucid-evolution/lucid";

interface LucidContextType {
  lucid: LucidEvolution | null;
  walletAddress: string | null;
  balance: number | null;
  seedPhrase: string | null;
  connecting: boolean;
  loading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
}

const LucidContext = createContext<LucidContextType>({
  lucid: null,
  walletAddress: null,
  balance: null,
  seedPhrase: null,
  connecting: false,
  loading: true,
  error: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshBalance: async () => {},
});

const STORAGE_KEY = "classly_dev_wallet_seed";
const ADDRESS_KEY = "classly_wallet_address";

export function LucidProvider({ children }: { children: ReactNode }) {
  const [lucid, setLucid] = useState<LucidEvolution | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lucidInstance, setLucidInstance] = useState<LucidEvolution | null>(
    null
  );
  // Get Blockfrost API key
  const BF_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  const STORAGE_KEY = "classly_dev_wallet_seed";
  /**
   * Main initialization effect - runs once on mount and whenever BF_KEY changes
   * This is the "all-in-one" pattern you're looking for
   */
  useEffect(() => {
    // Skip on server-side
    if (typeof window === "undefined") {
      console.log("⚠️ Running on server - skipping wallet init");
      return;
    }

    // IIFE (Immediately Invoked Function Expression) for async inside useEffect
    (async () => {
      try {
        console.log("🚀 Starting wallet initialization...");

        // Check if API key exists
        if (!BF_KEY || BF_KEY.length === 0) {
          throw new Error(
            "NEXT_PUBLIC_BLOCKFROST_API_KEY is not set.\n\n" +
              "Add it to your .env.local file:\n" +
              "NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodYourKeyHere\n\n" +
              "Then restart your dev server."
          );
        }

        console.log("✅ API key found:", BF_KEY.substring(0, 10) + "...");

        // Dynamic import of Lucid modules (critical for Next.js + WASM)
        console.log("📦 Importing Lucid Evolution...");
        const { Lucid, Blockfrost, generateSeedPhrase } = await import(
          "@lucid-evolution/lucid"
        );
        console.log("✅ Lucid modules imported");

        // Get or generate seed phrase
        let seed = localStorage.getItem(STORAGE_KEY);
        let isNewWallet = false;

        if (!seed) {
          console.log("🆕 Generating NEW wallet...");
          seed = generateSeedPhrase();
          localStorage.setItem(STORAGE_KEY, seed);
          isNewWallet = true;
          console.log("✅ New seed phrase generated and saved");
        } else {
          console.log("♻️ Loaded EXISTING wallet from localStorage");
        }

        setSeedPhrase(seed);

        // Initialize Lucid with Blockfrost
        // Initialize Lucid
        const lucid = await Lucid(
          new Blockfrost(
            "https://cardano-preprod.blockfrost.io/api/v0",
            BF_KEY || ""
          ),
          "Preprod"
        );
        setLucidInstance(lucid);
        setLucid(lucid); // make lucid available to consumers
        console.log("✅ Lucid instance created");

        // Select wallet from seed phrase
        lucid.selectWallet.fromSeed(seed);
        console.log("✅ Wallet selected from seed phrase");

        // Get wallet address
        const addr = await lucid.wallet().address();
        console.log("📬 Wallet address:", addr);
        setWalletAddress(addr);
        localStorage.setItem(ADDRESS_KEY, addr);

        // Fetch balance
        console.log("💰 Fetching wallet balance...");
        try {
          const utxos = await lucid.wallet().getUtxos();
          const total = utxos.reduce(
            (sum, u) => sum + BigInt(u.assets?.lovelace || 0),
            BigInt(0)
          );
          const ada = Number(total) / 1_000_000;
          setBalance(Number(ada.toFixed(6)));
        } catch (e) {
          console.error("⚠️ Error fetching balance:", e);
          setBalance(0);
        }

        // Success!
        setLoading(false);
        setError(null);

        if (isNewWallet) {
          console.log("🎉 New wallet created successfully!");
          console.log("⚠️ IMPORTANT: Save your seed phrase in a safe place!");
        } else {
          console.log("🎉 Wallet restored successfully!");
        }
      } catch (err: any) {
        console.error("❌ Wallet initialization failed:", err);
        console.error("Error name:", err?.name);
        console.error("Error message:", err?.message);
        console.error("Error stack:", err?.stack);

        setError(err?.message ?? "Failed to initialize wallet");
        setLucid(null);
        setWalletAddress(null);
        setBalance(null);
        setSeedPhrase(null);
        setLoading(false);
      }
    })();
  }, [BF_KEY]); // Re-run if BF_KEY changes

  /**
   * Manual refresh balance function
   */
  const refreshBalance = useCallback(async () => {
    if (!lucid) {
      console.warn("⚠️ Cannot refresh balance - Lucid not initialized");
      return;
    }

    try {
      console.log("🔄 Refreshing balance...");
      const utxos = await lucid.wallet().getUtxos();

      if (!utxos || utxos.length === 0) {
        setBalance(0);
        return;
      }

      const totalLovelace = utxos.reduce((sum, utxo) => {
        const lovelace = utxo.assets?.lovelace;
        if (lovelace === undefined || lovelace === null) return sum;

        if (typeof lovelace === "bigint") return sum + lovelace;
        if (typeof lovelace === "number") return sum + BigInt(lovelace);
        if (typeof lovelace === "string") return sum + BigInt(lovelace);

        return sum;
      }, BigInt(0));

      const adaBalance = Number(totalLovelace) / 1_000_000;
      console.log("✅ Balance refreshed:", adaBalance, "ADA");
      setBalance(adaBalance);
    } catch (err: any) {
      console.error("❌ Failed to refresh balance:", err);
      setError(err?.message ?? "Failed to refresh balance");
    }
  }, [lucid]);

  /**
   * Manual connect wallet (in case user wants to reconnect)
   */
  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Trigger re-initialization by forcing component update
    window.location.reload();
  }, []);

  /**
   * Disconnect wallet and clear all data
   */
  const disconnectWallet = useCallback(() => {
    console.log("👋 Disconnecting wallet...");

    setWalletAddress(null);
    setBalance(null);
    setLucid(null);
    setSeedPhrase(null);
    setError(null);

    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(ADDRESS_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }

    console.log("✅ Wallet disconnected and cleared");

    // Reload page to reinitialize
    window.location.reload();
  }, []);

  return (
    <LucidContext.Provider
      value={{
        lucid,
        walletAddress,
        balance,
        seedPhrase,
        connecting,
        loading,
        error,
        connectWallet,
        disconnectWallet,
        refreshBalance,
      }}
    >
      {children}
    </LucidContext.Provider>
  );
}

export const useLucid = () => useContext(LucidContext);
