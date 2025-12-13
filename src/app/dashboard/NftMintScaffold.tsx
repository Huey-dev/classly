"use client";

import { useState } from "react";

type ClaimState = {
  claimId?: string;
  fineLovelace?: string;
  estimatedFeeLovelace?: string;
  txHash?: string;
  status?: string;
  message?: string;
};

export function NftMintScaffold() {
  const [courseId, setCourseId] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [claim, setClaim] = useState<ClaimState>({});
  const [unsignedTx, setUnsignedTx] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(null);
    }
  };

  const loadConfig = () =>
    run("config", async () => {
      const res = await fetch(`/api/courses/${courseId}/nft-config`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load config");
      setConfig(data);
    });

  const prepareClaim = () =>
    run("prepare", async () => {
      const res = await fetch(`/api/courses/${courseId}/nft-claim/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientAddress, payerAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare claim");
      setClaim({
        claimId: data.claimId,
        fineLovelace: data.fineLovelace,
        estimatedFeeLovelace: data.estimatedFeeLovelace,
        status: data.status,
      });
    });

  const buildTx = () =>
    run("build", async () => {
      if (!claim.claimId) throw new Error("No claimId");
      const res = await fetch(`/api/nft-claim/${claim.claimId}/build-tx`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to build tx");
      setUnsignedTx(data.unsignedTxCbor);
      setClaim((c) => ({ ...c, message: "Unsigned tx ready (mock)" }));
    });

  const submitTx = () =>
    run("submit", async () => {
      if (!claim.claimId) throw new Error("No claimId");
      const res = await fetch(`/api/nft-claim/${claim.claimId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTxCbor: "mock-signed", txHash: "mocked_tx_hash" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit tx");
      setClaim((c) => ({ ...c, txHash: data.txHash, status: data.status }));
    });

  const checkStatus = () =>
    run("status", async () => {
      if (!claim.claimId) throw new Error("No claimId");
      const res = await fetch(`/api/nft-claim/${claim.claimId}/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load status");
      setClaim((c) => ({ ...c, status: data.status, txHash: data.txHash }));
    });

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="Course ID"
          className="flex-1 px-3 py-2 rounded-lg border"
        />
        <input
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="Recipient address"
          className="flex-1 px-3 py-2 rounded-lg border"
        />
        <input
          value={payerAddress}
          onChange={(e) => setPayerAddress(e.target.value)}
          placeholder="Payer address"
          className="flex-1 px-3 py-2 rounded-lg border"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={loadConfig} className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-60" disabled={!!loading}>
          Load Config
        </button>
        <button onClick={prepareClaim} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled={!!loading}>
          Prepare Claim
        </button>
        <button onClick={buildTx} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60" disabled={!!loading}>
          Build Tx (stub)
        </button>
        <button onClick={submitTx} className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-60" disabled={!!loading}>
          Submit (stub)
        </button>
        <button onClick={checkStatus} className="px-4 py-2 rounded bg-slate-700 text-white disabled:opacity-60" disabled={!!loading}>
          Check Status
        </button>
      </div>

      {loading && <p className="text-sm text-blue-500">Loading {loading}...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-white">
          <h4 className="font-semibold mb-2">Config</h4>
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(config, null, 2)}</pre>
        </div>
        <div className="p-4 rounded-lg border bg-white">
          <h4 className="font-semibold mb-2">Claim</h4>
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify({ ...claim, unsignedTx }, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
