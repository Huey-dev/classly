"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLucid } from "../context/LucidContext";
import type { UTxO } from "@lucid-evolution/lucid";

type TxLogItem = {
  time: string;
  action: string;
  status: string;
  amount: string;
  txHash: string;
  address: string;
};

export default function InvestorDemoDashboard() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId") || "";
  const [courseId, setCourseId] = useState(initialCourseId);
  const [scriptAddress, setScriptAddress] = useState<string | null>(null);
  const [escrowState, setEscrowState] = useState({
    netTotal: 0,
    paidCount: 0,
    paidOut: 0,
    released30: false,
    released40: false,
    releasedFinal: false,
    ratingSum: 0,
    ratingCount: 0,
    allWatchMet: true,
    firstWatch: Math.floor(Date.now() / 1000),
    disputeBy: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { lucid } = useLucid();
  const [simulatedAction, setSimulatedAction] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [txLog, setTxLog] = useState<TxLogItem[]>([]);
  const [utxoLoading, setUtxoLoading] = useState(false);
  const [utxoError, setUtxoError] = useState<string | null>(null);

  // Load DB escrow state
  useEffect(() => {
    if (!courseId) return;
    const fetchEscrow = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/escrow/${courseId}`);
        if (!res.ok) {
          throw new Error(`Unable to load escrow: ${res.status}`);
        }
        const data = await res.json();
        setScriptAddress(data.scriptAddress || null);
        setEscrowState({
          netTotal: Number(data.netTotal ?? 0),
          paidCount: Number(data.paidCount ?? 0),
          paidOut: Number(data.paidOut ?? 0),
          released30: !!data.released30,
          released40: !!data.released40,
          releasedFinal: !!data.releasedFinal,
          ratingSum: Number(data.ratingSum ?? 0),
          ratingCount: Number(data.ratingCount ?? 0),
          allWatchMet: data.allWatchMet ?? true,
          firstWatch: Number(data.firstWatch ?? Math.floor(Date.now() / 1000)),
          disputeBy: Number(data.disputeBy ?? Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60),
        });
      } catch (e: any) {
        setLoadError(e?.message || "Failed to load escrow");
      } finally {
        setLoading(false);
      }
    };
    fetchEscrow();
  }, [courseId]);

  // Load on-chain UTxOs at the script address
  useEffect(() => {
    const loadUtxos = async () => {
      if (!lucid || !scriptAddress) return;
      setUtxoLoading(true);
      setUtxoError(null);
      try {
        const utxos: UTxO[] = await lucid.utxosAt(scriptAddress);
        const mapped: TxLogItem[] = utxos.map((u) => {
          const lovelace = BigInt(u.assets?.lovelace ?? 0n);
          const hash = u.txHash ?? "";
          return {
            time: new Date().toLocaleTimeString(),
            action: u.datum ? "Escrow UTxO" : "Payment",
            status: "present",
            amount: `${(Number(lovelace) / 1_000_000).toFixed(4)} ADA`,
            txHash: hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : "unknown",
            address: u.address ?? scriptAddress ?? "",
          };
        });
        setTxLog(mapped);
      } catch (e: any) {
        setUtxoError(e?.message || "Failed to load UTxOs");
      } finally {
        setUtxoLoading(false);
      }
    };
    loadUtxos();
  }, [lucid, scriptAddress]);

  const toAda = (lovelace: number) => (lovelace / 1_000_000).toFixed(2);
  const avgRating = useMemo(
    () => (escrowState.ratingCount > 0 ? (escrowState.ratingSum / escrowState.ratingCount / 10).toFixed(1) : "0.0"),
    [escrowState.ratingCount, escrowState.ratingSum]
  );
  const daysRemaining = Math.max(0, Math.floor((escrowState.disputeBy - Date.now() / 1000) / (24 * 60 * 60)));
  const progress30 = (escrowState.paidCount / 5) * 100;
  const progressWatch = escrowState.allWatchMet ? 100 : 45;
  const progressRating = Math.min((parseFloat(avgRating) / 6) * 100, 100);

  const getPreviewState = () => {
    const newState = { ...escrowState };
    if (simulatedAction === "addPayment") {
      const netAmount = 9_300_000;
      const newCount = escrowState.paidCount + 1;
      if (newCount >= 5 && !escrowState.released30) {
        const totalNet = escrowState.netTotal + netAmount;
        const payout = Math.floor(totalNet * 0.3);
        newState.netTotal = totalNet - payout;
        newState.paidOut = payout;
        newState.released30 = true;
        newState.paidCount = newCount;
        newState.ratingSum += 85;
        newState.ratingCount += 1;
      } else if (escrowState.released30) {
        const payout = Math.floor(netAmount * 0.3);
        newState.netTotal = escrowState.netTotal + netAmount - payout;
        newState.paidOut = escrowState.paidOut + payout;
        newState.paidCount = newCount;
        newState.ratingSum += 85;
        newState.ratingCount += 1;
      } else {
        newState.netTotal += netAmount;
        newState.paidCount = newCount;
        newState.ratingSum += 85;
        newState.ratingCount += 1;
      }
    } else if (simulatedAction === "release40") {
      const payout = Math.floor(escrowState.netTotal * 0.4);
      newState.netTotal -= payout;
      newState.paidOut += payout;
      newState.released40 = true;
    } else if (simulatedAction === "releaseFinal") {
      newState.paidOut += newState.netTotal;
      newState.netTotal = 0;
      newState.releasedFinal = true;
    }
    return newState;
  };

  const simulateAction = (action: string) => {
    setSimulatedAction(action);
    setShowPreview(true);
  };

  const executeAction = () => {
    const preview = getPreviewState();
    const payoutDiff = preview.paidOut - escrowState.paidOut;
    setEscrowState(preview);
    const time = new Date().toLocaleTimeString();
    const actionMap: Record<string, string> = {
      addPayment: "AddPayment",
      release40: "Release 40%",
      releaseFinal: "Release Final",
    };
    setTxLog((prev) => [
      {
        time,
        action: actionMap[simulatedAction] || "Action",
        status: "confirmed",
        amount: payoutDiff > 0 ? `${toAda(payoutDiff)} ADA` : "0 ADA",
        txHash: Math.random().toString(36).substring(7) + "...",
        address: scriptAddress ?? "",
      },
        ...prev,
    ]);
    setShowPreview(false);
    setSimulatedAction("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Classly Escrow Demo</h1>
            <p className="text-blue-300 mt-1">Live Smart Contract Testing Dashboard</p>
            <div className="mt-3 flex gap-2">
              <input
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Enter course ID"
                className="px-3 py-2 rounded-lg text-sm text-slate-900"
              />
              <button
                onClick={() => setCourseId(courseId.trim())}
                className="px-3 py-2 rounded-lg bg-blue-600 text-sm font-semibold"
              >
                Load
              </button>
              {loadError && <span className="text-xs text-red-300">{loadError}</span>}
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-blue-300">Network: Preprod Testnet</p>
            <p className="font-mono text-xs text-slate-400 mt-1">
              Script: {scriptAddress ? `${scriptAddress.slice(0, 24)}...` : "unknown"}
            </p>
          </div>
        </div>

        {loading && (
          <div className="bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-blue-100">
            Loading escrow state...
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-2xl border border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Escrow Balance</h2>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
                  Active
                </span>
              </div>
              <div className="mb-6">
                <p className="text-5xl font-bold">{toAda(escrowState.netTotal + escrowState.paidOut)} ADA</p>
                <p className="text-slate-400 mt-1">Total accumulated funds</p>
              </div>
              <div className="space-y-4">
                <div className="relative h-16 rounded-lg overflow-hidden bg-slate-900/50 flex">
                  {escrowState.released30 && (
                    <div
                      className="bg-emerald-500 flex items-center justify-center text-sm font-semibold transition-all duration-500"
                      style={{ width: "30%" }}
                    >
                      30% Released
                    </div>
                  )}
                  {escrowState.released40 && (
                    <div
                      className="bg-blue-500 flex items-center justify-center text-sm font-semibold transition-all duration-500"
                      style={{ width: "40%" }}
                    >
                      40% Released
                    </div>
                  )}
                  <div
                    className="bg-amber-500 flex items-center justify-center text-sm font-semibold transition-all duration-500"
                    style={{ width: escrowState.releasedFinal ? "0%" : "30%" }}
                  >
                    {escrowState.releasedFinal ? "" : "30% Locked"}
                  </div>
                  {!escrowState.released30 && (
                    <div className="bg-slate-600 flex items-center justify-center text-sm font-semibold flex-1">
                      Pending
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400">Released</p>
                    <p className="text-xl font-bold text-emerald-400">{toAda(escrowState.paidOut)} ADA</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400">Locked</p>
                    <p className="text-xl font-bold text-amber-400">{toAda(escrowState.netTotal)} ADA</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400">Enrollments</p>
                    <p className="text-xl font-bold text-blue-400">{escrowState.paidCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-2xl border border-slate-600">
              <h2 className="text-2xl font-bold mb-4">Milestone Progress</h2>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">30% Release (5 Enrollments)</span>
                    <span className={`text-sm font-bold ${escrowState.released30 ? "text-emerald-400" : "text-slate-400"}`}>
                      {escrowState.paidCount}/5 {escrowState.released30 && "✓"}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${escrowState.released30 ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(progress30, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {escrowState.released30 ? "Complete! Instructor received initial payout" : `${Math.max(0, 5 - escrowState.paidCount)} more enrollments needed`}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">40% Release (60% Watch + Ratings)</span>
                    <span className={`text-sm font-bold ${escrowState.released40 ? "text-blue-400" : "text-slate-400"}`}>
                      {escrowState.released40 ? "Complete ✓" : "Pending"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Watch Time</p>
                      <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${progressWatch >= 60 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${progressWatch}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{progressWatch}% avg</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Avg Rating</p>
                      <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${progressRating >= 60 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${progressRating}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{avgRating}/10 ★</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Final 30% Release (14 Days)</span>
                    <span className={`text-sm font-bold ${escrowState.releasedFinal ? "text-purple-400" : "text-slate-400"}`}>
                      {escrowState.releasedFinal ? "Complete ✓" : `${daysRemaining} days left`}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${escrowState.releasedFinal ? "bg-purple-500" : "bg-slate-600"}`}
                      style={{ width: `${escrowState.releasedFinal ? 100 : Math.min(100, ((14 - daysRemaining) / 14) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {escrowState.releasedFinal ? "All funds released to instructor" : "No disputes filed - automatic release pending"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-2xl border border-slate-600">
              <h3 className="text-xl font-bold mb-4">🧪 Simulate Actions (local preview)</h3>
              <div className="space-y-3">
                <button
                  onClick={() => simulateAction("addPayment")}
                  disabled={escrowState.releasedFinal}
                  className="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  + Add Payment (Student Enrolls)
                </button>
                <button
                  onClick={() => simulateAction("release40")}
                  disabled={escrowState.released40 || !escrowState.released30}
                  className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  Release 40% (Metrics Met)
                </button>
                <button
                  onClick={() => simulateAction("releaseFinal")}
                  disabled={escrowState.releasedFinal || daysRemaining > 0}
                  className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  Release Final 30%
                </button>
              </div>

              {showPreview && (
                <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                  <p className="font-semibold mb-2">Preview Changes:</p>
                  {(() => {
                    const preview = getPreviewState();
                    const payoutDiff = preview.paidOut - escrowState.paidOut;
                    return (
                      <div className="text-sm space-y-1">
                        <p className="text-slate-300">
                          Net Total: {toAda(escrowState.netTotal)} → {toAda(preview.netTotal)} ADA
                        </p>
                        {payoutDiff > 0 && (
                          <p className="text-emerald-400 font-semibold">→ Instructor receives: +{toAda(payoutDiff)} ADA</p>
                        )}
                        <p className="text-slate-300">
                          Paid Count: {escrowState.paidCount} → {preview.paidCount}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={executeAction}
                      className="flex-1 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold"
                    >
                      Execute
                    </button>
                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setSimulatedAction("");
                      }}
                      className="flex-1 px-3 py-2 rounded bg-slate-600 hover:bg-slate-700 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-2xl border border-slate-600">
              <h3 className="text-xl font-bold mb-4">📜 On-chain UTxOs</h3>
              {utxoError && <p className="text-xs text-red-300 mb-2">{utxoError}</p>}
              {utxoLoading ? (
                <p className="text-sm text-blue-200">Loading UTxOs...</p>
              ) : txLog.length === 0 ? (
                <p className="text-sm text-slate-300">No UTxOs found at this script address.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {txLog.map((tx, i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{tx.action}</span>
                        <span className="text-emerald-400 text-xs">{tx.status}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{tx.amount}</p>
                      <p className="text-slate-500 text-xs font-mono mt-1">Tx: {tx.txHash}</p>
                      <p className="text-slate-500 text-[11px] break-all">Addr: {tx.address}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl p-6 border border-blue-500/30">
          <h3 className="text-xl font-bold mb-3">💡 How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-blue-300 mb-1">Same Script Address</p>
              <p className="text-slate-300">
                All courses use the same smart contract address. Each enrollment creates a separate UTxO with its own datum.
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-300 mb-1">Milestone-Based Payouts</p>
              <p className="text-slate-300">
                Funds are released automatically based on verifiable metrics: enrollments, watch time, ratings, and time elapsed.
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-300 mb-1">Trustless & Secure</p>
              <p className="text-slate-300">
                Neither students nor instructors can unilaterally withdraw. All logic is enforced on-chain by the Plutus validator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
