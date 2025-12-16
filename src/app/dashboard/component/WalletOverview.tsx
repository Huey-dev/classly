// src/app/dashboard/components/WalletOverview.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLucid } from '@/app/context/LucidContext';

/**
 * WalletOverview shows the currently connected Cardano testnet wallet.
 *
 * - Displays the wallet address with a copy button.
 * - Shows the available balance and allows a refresh.
 * - Allows the user to connect or disconnect their wallet.
 * - Optionally displays the seed phrase behind a toggle for testnet.
 */
export default function WalletOverview() {
  const {
    walletAddress,
    balance,
    seedPhrase,
    connecting,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  } = useLucid();

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'missing'>('idle');
  const [showSeed, setShowSeed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const copy = async (text?: string) => {
    if (!text || typeof navigator === 'undefined') {
      setCopyState('missing');
      setTimeout(() => setCopyState('idle'), 1200);
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 1200);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading wallet…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Wallet Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cardano testnet wallet via Lucid</p>
        </div>
        <div className="hidden sm:flex text-xs text-gray-500 dark:text-gray-400">
          Copy address → open faucet → choose preprod/preview → paste → captcha → come back & refresh.
        </div>
      </div>

      {error && (
        <div className="px-6 pt-4">
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      )}

      <div className="px-6 pt-4">
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-xs sm:text-sm text-blue-800 dark:text-blue-100 space-y-1">
          <p className="font-semibold">How to get test ADA (preprod/preview)</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Copy your wallet address below.</li>
            <li>
              Open the faucet and choose <strong>{process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK || 'preprod'}</strong>{' '}
              network:{" "}
              <a
                href="https://docs.cardano.org/cardano-testnet/tools/faucet/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Cardano testnet faucet
              </a>
              .
            </li>
            <li>Paste address, solve captcha, request funds, then return and click Refresh.</li>
          </ol>
        </div>
      </div>

      <div className="p-6 grid gap-4 md:grid-cols-3">
        {/* Address + copy/seed controls */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 md:col-span-2">
          <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">ADDRESS</p>
          <p className="mt-2 font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
            {walletAddress ?? 'Not connected'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => copy(walletAddress ?? undefined)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {copyState === 'copied' ? '✓ Copied' : 'Copy'}
            </button>
              {seedPhrase && (
                <button
                  onClick={() => setShowSeed((v) => !v)}
                  className="px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 hover:opacity-90"
                >
                {showSeed ? 'Hide Seed' : 'View Seed'}
              </button>
            )}
            {walletAddress ? (
              <button
                onClick={disconnectWallet}
                className="ml-auto px-3 py-2 rounded-lg border border-red-300 dark:border-red-900 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:opacity-90"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="ml-auto px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-sm font-semibold text-white"
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>

          {/* Optional seed phrase display */}
          {showSeed && seedPhrase && (
            <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                If you leak this, you're basically live-streaming your wallet.
              </p>
              <p className="font-mono text-xs text-gray-800 dark:text-gray-200 break-words">{seedPhrase}</p>
              <button
                onClick={() => copy(seedPhrase)}
                className="mt-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold bg-gray-50 dark:bg-gray-950 hover:opacity-90"
              >
                Copy seed
              </button>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">BALANCE</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {balance == null ? '—' : `${balance.toFixed(6)} ADA`}
          </p>
          <button
            onClick={async () => {
              setRefreshing(true);
              await refreshBalance();
              setRefreshing(false);
            }}
            disabled={!walletAddress || refreshing}
            className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {refreshing && <span className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />}
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {balance !== null && balance <= 0 && (
            <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">
              No funds detected. Use the faucet steps above, then refresh.
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Network: {process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK || 'preview'} (Blockfrost)
          </p>
        </div>
      </div>
    </div>
  );
}
