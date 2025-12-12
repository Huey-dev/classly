'use client';

import { useState } from 'react';

type Props = {
  userId: string;
  initialWallet: string | null | undefined;
};

export function OwnerWalletBanner({ userId, initialWallet }: Props) {
  const [wallet, setWallet] = useState(initialWallet ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save wallet');
      }
      setMessage('Wallet saved.');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save wallet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <p className="text-sm font-semibold text-amber-800">Payout wallet</p>
      <p className="text-xs text-amber-700">
        Set the Cardano address for instructor payouts (Preprod). This address will be used as the receiver in escrow.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="addr_test1..."
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
        />
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {message && <p className="text-xs text-amber-700">{message}</p>}
    </div>
  );
}

