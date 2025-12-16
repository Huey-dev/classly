"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LucidEvolution } from "@lucid-evolution/lucid";

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

const STORAGE_KEY_BASE = "classly_dev_wallet_seed";
const ADDRESS_KEY_BASE = "classly_wallet_address";
const BLOCKFROST_NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "preview").toLowerCase();
const BLOCKFROST_BASE =
  BLOCKFROST_NETWORK.includes("preprod")
    ? "https://cardano-preprod.blockfrost.io/api/v0"
    : BLOCKFROST_NETWORK.includes("mainnet")
    ? "https://cardano-mainnet.blockfrost.io/api/v0"
    : "https://cardano-preview.blockfrost.io/api/v0";
const BLOCKFROST_LUCID_NETWORK = BLOCKFROST_NETWORK.includes("preprod")
  ? "Preprod"
  : BLOCKFROST_NETWORK.includes("mainnet")
  ? "Mainnet"
  : "Preview";

const isAddressUnseenError = (err: any) => {
  const status = err?.status_code ?? err?.status ?? err?.response?.status;
  const msg = (err?.message || "").toLowerCase();
  return status === 404 || msg.includes("component has not been found");
};
const isNetworkMismatch = (err: any) => {
  const status = err?.status_code ?? err?.status ?? err?.response?.status;
  const msg = (err?.message || "").toLowerCase();
  return status === 403 || msg.includes("network token mismatch");
};

export function LucidProvider({ children }: { children: ReactNode }) {
  const [lucid, setLucid] = useState<LucidEvolution | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string>("anon");

  const BF_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;

  const fetchAndSetBalance = useCallback(
    async (client: LucidEvolution) => {
      try {
        const utxos = await client.wallet().getUtxos();
        if (!Array.isArray(utxos) || utxos.length === 0) {
          setBalance(0);
          setError("Wallet not yet on-chain. Fund from faucet, then refresh.");
          return;
        }

        const total = utxos.reduce((sum, u) => {
          const raw = u.assets?.lovelace ?? 0;
          let lovelace: bigint;
          try {
            if (typeof raw === "bigint") lovelace = raw;
            else if (typeof raw === "number") lovelace = BigInt(raw);
            else if (typeof raw === "string") lovelace = BigInt(raw);
            else lovelace = BigInt(0);
          } catch {
            lovelace = BigInt(0);
          }
          return sum + lovelace;
        }, BigInt(0));

        const ada = Number(total) / 1_000_000;
        setBalance(Number(ada.toFixed(6)));
        setError(null);
      } catch (err: any) {
        if (isNetworkMismatch(err)) {
          setBalance(null);
          setError(
            "Blockfrost rejected the request. Ensure NEXT_PUBLIC_BLOCKFROST_API_KEY matches the selected network (preview vs preprod)."
          );
        } else if (isAddressUnseenError(err)) {
          setBalance(0);
          setError("Wallet not yet on-chain. Send test ADA from faucet, then refresh.");
        } else {
          console.error("Failed to fetch balance:", err);
          setBalance(0);
          setError(err?.message ?? "Failed to fetch balance");
        }
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Fetch user id to namespace wallet storage per user
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            setUserKey(data.id);
            return;
          }
        }
      } catch {
        // ignore and fall back to anon
      }
      setUserKey("anon");
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (async () => {
      try {
        if (!BF_KEY || BF_KEY.length === 0) {
          throw new Error(
            "NEXT_PUBLIC_BLOCKFROST_API_KEY is not set. Add it to your .env.local and restart dev server."
          );
        }

        const { Lucid, Blockfrost, generateSeedPhrase } = await import("@lucid-evolution/lucid");

        const storageKey = `${STORAGE_KEY_BASE}_${userKey}`;
        const addressKey = `${ADDRESS_KEY_BASE}_${userKey}`;

        let seed = localStorage.getItem(storageKey);
        let isNewWallet = false;

        if (!seed) {
          seed = generateSeedPhrase();
          localStorage.setItem(storageKey, seed);
          isNewWallet = true;
        }

        setSeedPhrase(seed);

        const lucidClient = await Lucid(new Blockfrost(BLOCKFROST_BASE, BF_KEY || ""), BLOCKFROST_LUCID_NETWORK);
        setLucid(lucidClient);

        lucidClient.selectWallet.fromSeed(seed);

        const addr = await lucidClient.wallet().address();
        setWalletAddress(addr);
        localStorage.setItem(addressKey, addr);

        await fetchAndSetBalance(lucidClient);

        setLoading(false);
        setError(null);

        if (isNewWallet) {
          console.log("New wallet created.");
        }
      } catch (err: any) {
        console.error("Wallet initialization failed:", err);
        if (isNetworkMismatch(err)) {
          setError(
            "Blockfrost forbidden: token/network mismatch. Set NEXT_PUBLIC_NETWORK (or NEXT_PUBLIC_BLOCKFROST_NETWORK) to match your token (preview or preprod)."
          );
        } else {
          setError(err?.message ?? "Failed to initialize wallet");
        }
        setLucid(null);
        setWalletAddress(null);
        setBalance(null);
        setSeedPhrase(null);
        setLoading(false);
      }
    })();
  }, [BF_KEY, fetchAndSetBalance, userKey]);

  const refreshBalance = useCallback(async () => {
    if (!lucid) {
      console.warn("Cannot refresh balance - Lucid not initialized");
      return;
    }

    await fetchAndSetBalance(lucid);
  }, [fetchAndSetBalance, lucid]);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    setLoading(true);
    setError(null);
    window.location.reload();
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setBalance(null);
    setLucid(null);
    setSeedPhrase(null);
    setError(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(`${ADDRESS_KEY_BASE}_${userKey}`);
      localStorage.removeItem(`${STORAGE_KEY_BASE}_${userKey}`);
    }

    window.location.reload();
  }, [userKey]);

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
