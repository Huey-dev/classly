'use client';

import { useEffect, useMemo, useState } from "react";
import { Data } from "@lucid-evolution/lucid";
import {
  calculateNetAmount,
  EscrowDatum,
  EscrowDatumSchema,
  EscrowRedeemerSchema,
  getEscrowAddress,
  getEscrowValidator,
  resolveNetwork,
} from "../lib/contracts";
import {
  averageRating,
  breakdownFromDatum,
  computeAddPaymentTransition,
  disputeCountdown,
  enrollmentProgress,
  formatAda,
  normalizePkh,
} from "../lib/escrow-utils";
import { useLucid } from "../context/LucidContext";

type EscrowRow = {
  id: string;
  courseId: string | null;
  receiverPkh?: string | null;
  oraclePkh?: string | null;
  scriptAddress?: string | null;
  netTotal?: string | null;
  paidCount?: number | null;
  paidOut?: string | null;
  released30?: boolean | null;
  released40?: boolean | null;
  releasedFinal?: boolean | null;
  comments?: number | null;
  ratingSum?: number | null;
  ratingCount?: number | null;
  allWatchMet?: boolean | null;
  firstWatch?: string | number | null;
  disputeBy?: string | number | null;
  status?: string | null;
};

type TxLog = {
  id: string;
  message: string;
  detail?: string;
  status: "pending" | "ok" | "error";
  txHash?: string;
  at: number;
};

const ACTIONS = [
  { value: "add", label: "Add Payment (student enrolls)" },
  { value: "release40", label: "Release 40% (metrics met)" },
  { value: "releaseFinal", label: "Release Final 30% (after dispute window)" },
  { value: "dispute", label: "Trigger Dispute (off-chain stub)" },
];

function toDatumFromState(state: EscrowRow | null): EscrowDatum | null {
  if (!state) return null;
  return {
    receiver: state.receiverPkh || "",
    oracle: state.oraclePkh || "",
    netTotal: BigInt(state.netTotal ?? 0),
    paidCount: BigInt(state.paidCount ?? 0),
    paidOut: BigInt(state.paidOut ?? 0),
    released30: !!state.released30,
    released40: !!state.released40,
    releasedFinal: !!state.releasedFinal,
    comments: BigInt(state.comments ?? 0),
    ratingSum: BigInt(state.ratingSum ?? 0),
    ratingCount: BigInt(state.ratingCount ?? 0),
    allWatchMet: !!state.allWatchMet,
    firstWatch: BigInt(state.firstWatch ?? 0),
    disputeBy: BigInt(state.disputeBy ?? 0),
  };
}

export default function EscrowTestPage() {
  const { lucid, walletAddress, connectWallet, loading } = useLucid();
  const [courseId, setCourseId] = useState("test-course-001");
  const [grossAda, setGrossAda] = useState(10);
  const [watchMet, setWatchMet] = useState(true);
  const [ratingX10, setRatingX10] = useState(85);
  const [commented, setCommented] = useState(true);
  const [firstWatchAt, setFirstWatchAt] = useState<number>(Math.floor(Date.now() / 1000));
  const [instructorAddress, setInstructorAddress] = useState("");
  const [oracleInput, setOracleInput] = useState(process.env.NEXT_PUBLIC_ORACLE_PKH || "");
  const [action, setAction] = useState<string>("add");
  const [logs, setLogs] = useState<TxLog[]>([]);
  const [escrow, setEscrow] = useState<EscrowRow | null>(null);
  const [onChainDatum, setOnChainDatum] = useState<EscrowDatum | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const grossLovelace = useMemo(() => BigInt(Math.floor((grossAda || 0) * 1_000_000)), [grossAda]);
  const netLovelace = useMemo(() => calculateNetAmount(grossLovelace), [grossLovelace]);
  const optimisticDatum = onChainDatum ?? toDatumFromState(escrow);
  const breakdown = breakdownFromDatum(optimisticDatum);
  const enrollment = enrollmentProgress(optimisticDatum?.paidCount ?? escrow?.paidCount ?? 0);
  const disputeTimer = disputeCountdown(optimisticDatum?.disputeBy ?? 0);
  const average = averageRating(optimisticDatum?.ratingSum ?? 0, optimisticDatum?.ratingCount ?? 0);

  const addLog = (entry: Omit<TxLog, "id" | "at">) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setLogs((prev) => [{ ...entry, id, at: Date.now() }, ...prev].slice(0, 80));
    return id;
  };

  const updateLog = (id: string, patch: Partial<TxLog>) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const fetchEscrow = async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/escrow/${courseId}`);
      const data = await res.json();
      if (res.ok) {
        setEscrow(data);
      }
    } catch {
      // swallow for now
    }
  };

  const fetchOnChain = async () => {
    if (!lucid || !escrow?.scriptAddress) return;
    try {
      const utxos = await lucid.utxosAt(escrow.scriptAddress);
      const target = utxos.find((u) => !!u.datum);
      if (target?.datum) {
        const datum = Data.from(target.datum, EscrowDatumSchema) as unknown as EscrowDatum;
        setOnChainDatum(datum);
      }
    } catch {
      setOnChainDatum(null);
    }
  };

  const refresh = async () => {
    await fetchEscrow();
    await fetchOnChain();
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lucid]);

  const preview = useMemo(() => {
    const before = optimisticDatum;
    if (!before) return null;
    if (action === "add") {
      const { newDatum, immediatePayout } = computeAddPaymentTransition(before, netLovelace, {
        watchMet,
        ratingX10,
        commented,
        firstWatchAt: BigInt(firstWatchAt),
      });
      return {
        before,
        after: newDatum,
        note: `Immediate payout: ${formatAda(immediatePayout)} ADA`,
      };
    }
    if (action === "release40") {
      const payout = (before.netTotal * 40n) / 100n;
      const after: EscrowDatum = { ...before, netTotal: before.netTotal - payout, paidOut: (before.paidOut ?? 0n) + payout, released40: true };
      return { before, after, note: `Release 40% (${formatAda(payout)} ADA)` };
    }
    if (action === "releaseFinal") {
      const payout = before.netTotal;
      const after: EscrowDatum = { ...before, netTotal: 0n, paidOut: (before.paidOut ?? 0n) + payout, releasedFinal: true, released40: true };
      return { before, after, note: `Release final (${formatAda(payout)} ADA)` };
    }
    if (action === "dispute") {
      return { before, after: before, note: "Flags dispute (off-chain stub)" };
    }
    return null;
  }, [action, optimisticDatum, netLovelace, watchMet, ratingX10, commented, firstWatchAt]);

  const submitTx = async (txBuilderPromise: Promise<any>, label: string) => {
    setSubmitting(true);
    const logId = addLog({ message: `${label} submitted`, status: "pending" });
    try {
      const tx = await txBuilderPromise;
      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      updateLog(logId, { message: `${label} submitted`, status: "pending", txHash: hash });

      if (lucid) {
        lucid.awaitTx(hash).then((ok) => {
          updateLog(logId, { status: ok ? "ok" : "error", detail: ok ? "Confirmed" : "Not confirmed" });
          refresh();
        });
      }
      setSubmitting(false);
      return hash;
    } catch (e: any) {
      updateLog(logId, { status: "error", detail: e?.message || "Transaction failed" });
      setSubmitting(false);
      throw e;
    }
  };

  const ensureWallet = async () => {
    if (!lucid) {
      await connectWallet();
      if (!lucid) throw new Error("Wallet not connected");
    }
    return lucid!;
  };

  const createEscrow = async () => {
    const l = await ensureWallet();
    if (!courseId) throw new Error("Course ID required");
    if (!instructorAddress) throw new Error("Instructor address is required");
    const receiverPkh = normalizePkh(instructorAddress, "Instructor wallet");
    const oraclePkh = normalizePkh(oracleInput || process.env.NEXT_PUBLIC_ORACLE_PKH || "", "Oracle key hash");
    const scriptAddress = await getEscrowAddress(l, resolveNetwork());

    const datum: EscrowDatum = {
      receiver: receiverPkh,
      oracle: oraclePkh,
      netTotal: netLovelace,
      paidCount: 1n,
      paidOut: 0n,
      released30: false,
      released40: false,
      releasedFinal: false,
      comments: commented ? 1n : 0n,
      ratingSum: BigInt(ratingX10),
      ratingCount: ratingX10 > 0 ? 1n : 0n,
      allWatchMet: watchMet,
      firstWatch: BigInt(firstWatchAt),
      disputeBy: BigInt(firstWatchAt + 14 * 24 * 60 * 60),
    };

    const txBuilder = l
      .newTx()
      .pay.ToContract(
        scriptAddress,
        { kind: "inline", value: Data.to(datum as any, EscrowDatumSchema) },
        { lovelace: netLovelace }
      );

    await submitTx(txBuilder.complete(), "Create escrow");
    await fetch("/api/escrow/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        receiverPkh,
        oraclePkh,
        scriptAddress,
        netTotal: datum.netTotal.toString(),
        paidCount: Number(datum.paidCount),
        paidOut: "0",
        released30: false,
        released40: false,
        releasedFinal: false,
        comments: Number(datum.comments),
        ratingSum: Number(datum.ratingSum),
        ratingCount: Number(datum.ratingCount),
        allWatchMet: datum.allWatchMet,
        firstWatch: Number(datum.firstWatch),
        disputeBy: Number(datum.disputeBy),
        status: "PENDING",
      }),
    }).catch(() => {});
    await refresh();
  };

  const addPayment = async () => {
    const l = await ensureWallet();
    if (!escrow?.scriptAddress) throw new Error("No script address on record");
    const utxos = await l.utxosAt(escrow.scriptAddress);
    const target = utxos.find((u) => !!u.datum);
    if (!target?.datum) throw new Error("Escrow UTxO not found on-chain");

    const currentDatum = Data.from(target.datum, EscrowDatumSchema) as unknown as EscrowDatum;
    const { newDatum, immediatePayout } = computeAddPaymentTransition(currentDatum, netLovelace, {
      watchMet,
      ratingX10,
      commented,
      firstWatchAt: BigInt(firstWatchAt),
    });

    const redeemer = Data.to(
      {
        AddPayment: {
          netAmount: netLovelace,
          watchMet,
          ratingX10: BigInt(ratingX10),
          commented,
          firstWatchAt: BigInt(firstWatchAt),
        },
      } as any,
      EscrowRedeemerSchema
    );
    const validatorScript = await getEscrowValidator();
    const signerAddress = walletAddress || (await l.wallet().address());
    const receiverAddr = instructorAddress && instructorAddress.startsWith("addr") ? instructorAddress : signerAddress;
    const txBuilder = l
      .newTx()
      .collectFrom([target], redeemer)
      .attach.SpendingValidator({ type: "PlutusV3", script: validatorScript })
      .addSigner(signerAddress);

    if (immediatePayout > 0n) {
      txBuilder.pay.ToAddress(receiverAddr, { lovelace: immediatePayout });
    }

    txBuilder.pay.ToContract(
      escrow.scriptAddress,
      { kind: "inline", value: Data.to(newDatum as any, EscrowDatumSchema) },
      { lovelace: newDatum.netTotal }
    );

    await submitTx(txBuilder.complete({ setCollateral: 5_000_000n }), "Add payment");
    await fetch("/api/escrow/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        receiverPkh: escrow.receiverPkh,
        oraclePkh: escrow.oraclePkh,
        scriptAddress: escrow.scriptAddress,
        netTotal: newDatum.netTotal.toString(),
        paidCount: Number(newDatum.paidCount),
        paidOut: newDatum.paidOut?.toString?.() || "0",
        released30: newDatum.released30,
        released40: newDatum.released40,
        releasedFinal: newDatum.releasedFinal,
        comments: Number(newDatum.comments),
        ratingSum: Number(newDatum.ratingSum),
        ratingCount: Number(newDatum.ratingCount),
        allWatchMet: newDatum.allWatchMet,
        firstWatch: Number(newDatum.firstWatch),
        disputeBy: Number(newDatum.disputeBy),
        status: escrow.status ?? "PENDING",
      }),
    }).catch(() => {});
    await refresh();
  };

  const release40 = async () => {
    const l = await ensureWallet();
    if (!escrow?.scriptAddress) throw new Error("No script address on record");
    const utxos = await l.utxosAt(escrow.scriptAddress);
    const target = utxos.find((u) => !!u.datum);
    if (!target?.datum) throw new Error("Escrow UTxO not found on-chain");

    const currentDatum = Data.from(target.datum, EscrowDatumSchema) as unknown as EscrowDatum;
    const payout = (currentDatum.netTotal * 40n) / 100n;
    if (payout <= 0n) throw new Error("Nothing to release");
    const newDatum: EscrowDatum = {
      ...currentDatum,
      netTotal: currentDatum.netTotal - payout,
      paidOut: (currentDatum.paidOut ?? 0n) + payout,
      released40: true,
    };

    const redeemer = Data.to("ReleaseMetrics40" as any, EscrowRedeemerSchema);
    const validatorScript = await getEscrowValidator();
    const signerAddress = walletAddress || (await l.wallet().address());
    const receiver = instructorAddress && instructorAddress.startsWith("addr") ? instructorAddress : signerAddress;
    const txBuilder = l
      .newTx()
      .collectFrom([target], redeemer)
      .attach.SpendingValidator({ type: "PlutusV3", script: validatorScript })
      .addSigner(signerAddress);

    txBuilder
      .pay.ToAddress(receiver, { lovelace: payout })
      .pay.ToContract(
        escrow.scriptAddress,
        { kind: "inline", value: Data.to(newDatum as any, EscrowDatumSchema) },
        { lovelace: newDatum.netTotal }
      );

    await submitTx(txBuilder.complete({ setCollateral: 5_000_000n }), "Release 40%");
    await refresh();
  };

  const releaseFinal = async () => {
    const l = await ensureWallet();
    if (!escrow?.scriptAddress) throw new Error("No script address on record");
    const utxos = await l.utxosAt(escrow.scriptAddress);
    const target = utxos.find((u) => !!u.datum);
    if (!target?.datum) throw new Error("Escrow UTxO not found on-chain");

    const currentDatum = Data.from(target.datum, EscrowDatumSchema) as unknown as EscrowDatum;
    const remaining = disputeCountdown(currentDatum.disputeBy).seconds;
    if (remaining > 0) {
      throw new Error(`Dispute window still active (${remaining} seconds remaining)`);
    }
    const payout = currentDatum.netTotal;
    const newDatum: EscrowDatum = {
      ...currentDatum,
      netTotal: 0n,
      paidOut: (currentDatum.paidOut ?? 0n) + payout,
      released40: true,
      releasedFinal: true,
    };

    const redeemer = Data.to("ReleaseFinal" as any, EscrowRedeemerSchema);
    const validatorScript = await getEscrowValidator();
    const signerAddress = walletAddress || (await l.wallet().address());
    const receiver = instructorAddress && instructorAddress.startsWith("addr") ? instructorAddress : signerAddress;
    const txBuilder = l
      .newTx()
      .validFrom(Number(currentDatum.disputeBy ?? 0n))
      .collectFrom([target], redeemer)
      .attach.SpendingValidator({ type: "PlutusV3", script: validatorScript })
      .addSigner(signerAddress)
      .pay.ToAddress(receiver, { lovelace: payout })
      .pay.ToContract(
        escrow.scriptAddress,
        { kind: "inline", value: Data.to(newDatum as any, EscrowDatumSchema) },
        { lovelace: newDatum.netTotal }
      );

    await submitTx(txBuilder.complete({ setCollateral: 5_000_000n }), "Release final");
    await refresh();
  };

  const submitAction = async () => {
    try {
      if (action === "add") return addPayment();
      if (action === "release40") return release40();
      if (action === "releaseFinal") return releaseFinal();
      if (action === "dispute") {
        addLog({ message: "Dispute flagged (off-chain only)", status: "ok" });
        await fetch(`/api/escrow/${courseId}/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Manual trigger from escrow-test" }),
        }).catch(() => {});
        await refresh();
        return;
      }
    } catch (e: any) {
      addLog({ message: "Action failed", status: "error", detail: e?.message || "Transaction failed" });
      setSubmitting(false);
    }
  };

  const statusColor = {
    pending: "text-yellow-700 bg-yellow-100",
    ok: "text-emerald-700 bg-emerald-100",
    error: "text-red-700 bg-red-100",
  } as const;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Escrow testing & visualization</p>
            <h1 className="text-2xl font-semibold">Escrow Test Bench</h1>
          </div>
          <div className="text-xs text-slate-500">
            {walletAddress ? `Wallet: ${walletAddress.slice(0, 12)}...` : loading ? "Connecting wallet..." : "No wallet"}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Config panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">⚙️ Test Configuration</h2>
              <button
                onClick={() => refresh()}
                className="text-xs rounded-lg border px-2 py-1"
              >
                Load from course
              </button>
            </div>
            <label className="text-xs font-semibold">Course ID</label>
            <input value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />

            <label className="text-xs font-semibold">Instructor address</label>
            <input
              value={instructorAddress}
              onChange={(e) => setInstructorAddress(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="addr_test..."
            />

            <label className="text-xs font-semibold">Oracle PKH (or address)</label>
            <input
              value={oracleInput}
              onChange={(e) => setOracleInput(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="oracle key hash"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Gross amount (ADA)</label>
                <input
                  type="number"
                  value={grossAda}
                  onChange={(e) => setGrossAda(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Rating x10</label>
                <input
                  type="number"
                  value={ratingX10}
                  onChange={(e) => setRatingX10(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={watchMet} onChange={(e) => setWatchMet(e.target.checked)} />
                Watch met
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={commented} onChange={(e) => setCommented(e.target.checked)} />
                Commented
              </label>
            </div>

            <label className="text-xs font-semibold">First watch at (epoch secs)</label>
            <input
              type="number"
              value={firstWatchAt}
              onChange={(e) => setFirstWatchAt(Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />

            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => createEscrow()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
                disabled={submitting}
              >
                Create Escrow
              </button>
              <button
                onClick={() => refresh()}
                className="rounded-lg border px-3 py-2"
              >
                Refresh State
              </button>
            </div>
          </div>

          {/* Visualization */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">📊 Escrow State</h2>
              <div className="text-xs text-slate-500">
                Total locked: {formatAda(breakdown.total)} ADA | Paid out: {formatAda(breakdown.paidOut)} ADA
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-3 bg-emerald-500"
                  style={{ width: `${Math.min(100, (Number(breakdown.paidOut) / Math.max(1, Number(breakdown.total || 1n))) * 100)}%` }}
                />
              </div>
              <div className="text-xs flex gap-4 flex-wrap text-slate-600">
                <span>30%: {breakdown.released30 ? "✅ released" : "⏳ pending"}</span>
                <span>40%: {breakdown.released40 ? "✅ released" : "⏳ pending"}</span>
                <span>Final: {breakdown.releasedFinal ? "✅ released" : "⏳ pending"}</span>
                <span>Enrollments: {String(enrollment.count)} / 5</span>
                <span>Avg rating: {average.toFixed(2)} / 10</span>
                <span>Dispute window: {disputeTimer.days}d {disputeTimer.hours}h {disputeTimer.minutes}m</span>
              </div>
            </div>

            {/* Simulator */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">🧪 Transaction Simulator</h3>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              {preview ? (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-white p-3">
                    <p className="font-semibold text-slate-700">Before</p>
                    <p>Net Total: {formatAda(preview.before.netTotal)} ADA</p>
                    <p>Paid Count: {String(preview.before.paidCount)}</p>
                    <p>Paid Out: {formatAda(preview.before.paidOut)} ADA</p>
                    <p>Flags: 30% {preview.before.released30 ? "✅" : "⏳"} | 40% {preview.before.released40 ? "✅" : "⏳"} | Final {preview.before.releasedFinal ? "✅" : "⏳"}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="font-semibold text-slate-700">After (if submitted)</p>
                    <p>Net Total: {formatAda(preview.after.netTotal)} ADA</p>
                    <p>Paid Count: {String(preview.after.paidCount)}</p>
                    <p>Paid Out: {formatAda(preview.after.paidOut)} ADA</p>
                    <p>Flags: 30% {preview.after.released30 ? "✅" : "⏳"} | 40% {preview.after.released40 ? "✅" : "⏳"} | Final {preview.after.releasedFinal ? "✅" : "⏳"}</p>
                    <p className="text-xs text-slate-500 mt-1">{preview.note}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No escrow loaded yet.</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => submitAction()}
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-sm disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Transaction"}
                </button>
                <button
                  onClick={() => refresh()}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Reset / Refresh
                </button>
              </div>
            </div>

            {/* Logs and debug */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">📜 Transaction Log</h3>
                <div className="flex gap-2">
                  <button onClick={() => setLogs([])} className="rounded-lg border px-2 py-1 text-xs">
                    Clear
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(logs, null, 2))}
                    className="rounded-lg border px-2 py-1 text-xs"
                  >
                    Copy JSON
                  </button>
                </div>
              </div>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500">No transactions yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className={`rounded-lg px-3 py-2 text-sm ${statusColor[log.status]}`}>
                      <div className="flex items-center justify-between">
                        <span>{log.message}</span>
                        <span className="text-xs">{new Date(log.at).toLocaleTimeString()}</span>
                      </div>
                      {log.txHash && (
                        <p className="text-xs break-all">
                          Tx: <a className="underline" target="_blank" rel="noreferrer" href={`https://preprod.cardanoscan.io/transaction/${log.txHash}`}>{log.txHash}</a>
                        </p>
                      )}
                      {log.detail && <p className="text-xs">{log.detail}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">🔧 Debug Panel</h3>
                <button onClick={() => refresh()} className="rounded-lg border px-2 py-1 text-xs">Refresh UTxOs</button>
              </div>
              <p>Script address: {escrow?.scriptAddress || "n/a"}</p>
              <p>Receiver PKH: {escrow?.receiverPkh || "n/a"}</p>
              <p>Oracle PKH: {escrow?.oraclePkh || "n/a"}</p>
              <p>Current UTxO datum:</p>
              <pre className="bg-white rounded-lg border px-3 py-2 text-xs overflow-x-auto max-h-48">
                {JSON.stringify(onChainDatum ?? optimisticDatum ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
