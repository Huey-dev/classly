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
  toppingUp: boolean;
  loading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
  requestTopup: (opts?: { ada?: number }) => Promise<void>;
}

const LucidContext = createContext<LucidContextType>({
  lucid: null,
  walletAddress: null,
  balance: null,
  seedPhrase: null,
  connecting: false,
  toppingUp: false,
  loading: true,
  error: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshBalance: async () => {},
  requestTopup: async () => {},
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
  const [toppingUp, setToppingUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [profileWallet, setProfileWallet] = useState<string | null>(null);
  const [autoTopupAttempted, setAutoTopupAttempted] = useState(false);
  const [lastTopupAt, setLastTopupAt] = useState<number | null>(null);
  const [lastTopupTxHash, setLastTopupTxHash] = useState<string | null>(null);

  const BF_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;

  const fetchAndSetBalance = useCallback(
    async (client: LucidEvolution) => {
      try {
        const utxos = await client.wallet().getUtxos();
        if (!Array.isArray(utxos) || utxos.length === 0) {
          setBalance(0);
          // Don't overwrite a more specific top-up error, and don't spam the user while a top-up is pending.
          const topupPending = lastTopupAt ? Date.now() - lastTopupAt < 90_000 : false;
          if (topupPending) {
            setError((prev) => prev || "Top-up pending on-chain. Give it a minute, then refresh.");
          } else {
            setError((prev) => prev || "Wallet not yet on-chain. Fund from faucet, then refresh.");
          }
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
          const topupPending = lastTopupAt ? Date.now() - lastTopupAt < 90_000 : false;
          if (topupPending) {
            setError((prev) => prev || "Top-up pending on-chain. Give it a minute, then refresh.");
          } else {
            setError((prev) => prev || "Wallet not yet on-chain. Send test ADA from faucet, then refresh.");
          }
        } else {
          console.error("Failed to fetch balance:", err);
          setBalance(0);
          setError(err?.message ?? "Failed to fetch balance");
        }
      }
    },
    [lastTopupAt]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Fetch user id to namespace wallet storage per user
    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const id = data?.id || data?.user?.id;
          setUserKey(id || "anon");
          setProfileWallet(data?.walletAddress ?? data?.user?.walletAddress ?? null);
          return;
        }
      } catch {
        // ignore and fall back to anon
      }
      setUserKey("anon");
      setProfileWallet(null);
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !userKey) {
      return;
    }

    (async () => {
      try {
        setAutoTopupAttempted(false);
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

  // Persist the generated wallet address onto the user profile so courses automatically reuse it.
  useEffect(() => {
    if (!walletAddress || !userKey || userKey === "anon") return;
    if (profileWallet && profileWallet === walletAddress) return;
    (async () => {
      try {
        await fetch(`/api/users/${userKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });
        setProfileWallet(walletAddress);
      } catch (err) {
        console.warn("Failed to persist wallet to profile", err);
      }
    })();
  }, [walletAddress, userKey, profileWallet]);

  const refreshBalance = useCallback(async () => {
    if (!lucid) {
      console.warn("Cannot refresh balance - Lucid not initialized");
      return;
    }

    await fetchAndSetBalance(lucid);
  }, [fetchAndSetBalance, lucid]);

  const requestTopup = useCallback(
    async (opts?: { ada?: number }) => {
      if (!lucid) {
        setError("Wallet not initialized");
        return;
      }
      if (!walletAddress) {
        setError("Wallet not connected");
        return;
      }
      setToppingUp(true);
      setLastTopupAt(Date.now());
      setLastTopupTxHash(null);
      setError("Requesting test ADA… this can take up to ~60s to land.");
      try {
        const res = await fetch("/api/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ address: walletAddress, ada: opts?.ada }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Top-up failed");
        if (json?.txHash) {
          setLastTopupTxHash(String(json.txHash));
          setError(`Top-up submitted: ${String(json.txHash).slice(0, 12)}... waiting for confirmation`);
        } else {
          setError(null);
        }
        // Give the network a moment then refresh
        await new Promise((r) => setTimeout(r, 2500));
        await refreshBalance();
        // Retry a few times in the background so users don't have to manually refresh
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 8000));
          await refreshBalance();
          // Check directly from the wallet so we don't rely on stale state
          try {
            const utxos = await lucid.wallet().getUtxos();
            const total = utxos.reduce((sum, u) => {
              const raw = u.assets?.lovelace ?? 0;
              try {
                if (typeof raw === "bigint") return sum + raw;
                if (typeof raw === "number") return sum + BigInt(raw);
                if (typeof raw === "string") return sum + BigInt(raw);
              } catch {
                return sum;
              }
              return sum;
            }, BigInt(0));
            const ada = Number(total) / 1_000_000;
            if (ada > 0) {
              setBalance(Number(ada.toFixed(6)));
              setError(null);
              break;
            }
          } catch (err) {
            console.warn("Balance check after top-up failed", err);
          }
        }
      } catch (e: any) {
        setError(`Top-up failed: ${e?.message || "unknown error"}`);
      } finally {
        setToppingUp(false);
      }
    },
    [lucid, refreshBalance, walletAddress]
  );

  // Auto top-up new/empty wallets on testnet so users can pay fees.
  useEffect(() => {
    if (autoTopupAttempted) return;
    if (!walletAddress || !lucid) return;
    // Faucet endpoint requires auth; don't auto-trigger for anonymous sessions.
    if (!userKey || userKey === "anon") return;
    if (BLOCKFROST_LUCID_NETWORK === "Mainnet") return;
    if (typeof balance !== "number") return;
    if (balance > 0) return;

    setAutoTopupAttempted(true);
    requestTopup({ ada: 5 }).catch(() => {});
  }, [autoTopupAttempted, balance, lucid, requestTopup, walletAddress, userKey]);

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
    setAutoTopupAttempted(false);
    setLastTopupAt(null);
    setLastTopupTxHash(null);

    if (typeof window !== "undefined" && userKey) {
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
        toppingUp,
        loading,
        error,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        requestTopup,
      }}
    >
      {children}
    </LucidContext.Provider>
  );
}

export const useLucid = () => useContext(LucidContext);
