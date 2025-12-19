'use client';

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Data } from "@lucid-evolution/lucid";
import {
  calculateNetAmount,
  EscrowDatum,
  EscrowDatumSchema,
  EscrowRedeemer,
  EscrowRedeemerSchema,
  getEscrowAddress,
  getEscrowValidator,
  resolveNetwork,
} from "../../lib/contracts";
import { computeAddPaymentTransition, disputeCountdown, normalizePkh, hashCourseId } from "../../lib/escrow-utils";
import { useLucid } from "../../context/LucidContext";

const formatCountdown = (val: any) => {
  if (!val) return "—";
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (typeof val === "object") {
    const d = val.days ?? 0;
    const h = val.hours ?? 0;
    const m = val.minutes ?? 0;
    const s = val.seconds ?? 0;
    return `${d}d ${h}h ${m}m ${s}s`;
  }
  return "—";
};

type EscrowState = {
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

type Props = {
  courseId: string;
  isOwner: boolean;
  isPaid: boolean;
  priceAda: number | null;
  initialGrossAda?: number | null;
  showFaucetLink?: boolean;
  courseTitle: string;
  authorName: string | null;
};

async function fetchEscrow(courseId: string): Promise<EscrowState | null> {
  try {
    const res = await fetch(`/api/escrow/${courseId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function syncEscrow(courseId: string, data: Partial<EscrowState>) {
  await fetch("/api/escrow/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, ...data }),
  });
}

export function EscrowWidget({
  courseId,
  isOwner,
  isPaid,
  priceAda,
  initialGrossAda,
  showFaucetLink = true,
  courseTitle,
  authorName,
}: Props) {
  const { lucid, walletAddress, loading, error, connectWallet, balance } = useLucid();
  const courseIdHash = hashCourseId(courseId);
  const router = useRouter();
  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [grossAda, setGrossAda] = useState(initialGrossAda ?? priceAda ?? 1);
  const [receiverAddress, setReceiverAddress] = useState<string>("");
  const [watchMet, setWatchMet] = useState(true);
  const [ratingX10, setRatingX10] = useState(80);
  const [commented, setCommented] = useState(true);
  // Validator expects POSIX milliseconds (see escrow.ak).
  const [firstWatchAt, setFirstWatchAt] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const lovelaceAmount = useMemo(() => BigInt(Math.floor((grossAda || 0) * 1_000_000)), [grossAda]);
  const netLovelace = useMemo(() => calculateNetAmount(lovelaceAmount), [lovelaceAmount]);
  const feeLovelace = useMemo(() => lovelaceAmount - netLovelace, [lovelaceAmount, netLovelace]);
  const remainingToFive = Math.max(0, 5 - (escrow?.paidCount ?? 0));
  const immediatePayoutPreview = useMemo(() => {
    if (!escrow) return 0n;
    const currentNet = escrow.netTotal ? BigInt(escrow.netTotal) : 0n;
    const netAmount = netLovelace;
    const newCount = BigInt((escrow.paidCount ?? 0) + 1);
    let newNet = currentNet + netAmount;
    let payout = 0n;
    if (!escrow.released30 && newCount >= 5n) {
      payout = (newNet * 30n) / 100n;
      newNet -= payout;
    } else if (escrow.released30 || (escrow.paidCount ?? 0) >= 5) {
      payout = (netAmount * 30n) / 100n;
      newNet -= payout;
    }
    return payout;
  }, [escrow, netLovelace]);
  const disputeTimer = useMemo(() => disputeCountdown(escrow?.disputeBy ?? 0), [escrow?.disputeBy]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const state = await fetchEscrow(courseId);
      if (!active) return;
      setEscrow(state);
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [courseId]);

  useEffect(() => {
    if (walletAddress && !receiverAddress) {
      setReceiverAddress(walletAddress);
    }
  }, [walletAddress, receiverAddress]);

  const handleCreate = async () => {
    // Escrow creation is intentionally disabled here; it must be done once at course creation.
    setLastError("Escrow creation is disabled here. Initialize escrow once during course creation, then use Add Payment to mutate it.");
    return;
  };

  const handleAddPayment = async () => {
    if (!lucid || !escrow) return;
    setSubmitting(true);
    setLastError(null);
    setTxHash(null);
    try {
      const validatorScript = await getEscrowValidator();
      const validator = { type: "PlutusV3", script: validatorScript } as const;
      const scriptAddr = escrow.scriptAddress || (await getEscrowAddress(lucid, resolveNetwork()));
      const utxos = await lucid.utxosAt(scriptAddr);
      const currentDatum: EscrowDatum = {
        courseId: courseIdHash,
        receiver: escrow.receiverPkh || "",
        oracle: escrow.oraclePkh || "",
        netTotal: BigInt(escrow.netTotal ?? 0),
        paidCount: BigInt(escrow.paidCount ?? 0),
        paidOut: BigInt(escrow.paidOut ?? 0),
        released30: !!escrow.released30,
        released40: !!escrow.released40,
        releasedFinal: !!escrow.releasedFinal,
        comments: BigInt(escrow.comments ?? 0),
        ratingSum: BigInt(escrow.ratingSum ?? 0),
        ratingCount: BigInt(escrow.ratingCount ?? 0),
        allWatchMet: !!escrow.allWatchMet,
        firstWatch: BigInt(escrow.firstWatch ?? 0),
        disputeBy: BigInt(escrow.disputeBy ?? 0),
      };
      const { newDatum, immediatePayout } = computeAddPaymentTransition(currentDatum, netLovelace, {
        watchMet,
        ratingX10,
        commented,
        firstWatchAt: BigInt(firstWatchAt),
      });

      const redeemer: EscrowRedeemer = {
        AddPayment: [
          {
            net_amount: netLovelace,
            watch_met: watchMet,
            rating_x10: BigInt(ratingX10),
            commented,
            first_watch_at: BigInt(firstWatchAt),
          },
        ],
      };
      const tx = await lucid
        .newTx()
        .collectFrom(utxos, Data.to(redeemer as any, EscrowRedeemerSchema))
        .attach.SpendingValidator(validator)
        .pay.ToContract(
          scriptAddr,
          { kind: "inline", value: Data.to(newDatum as any, EscrowDatumSchema) },
          { lovelace: newDatum.netTotal }
        )
        .complete();

      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      setTxHash(hash);
      await syncEscrow(courseId, {
        netTotal: newDatum.netTotal.toString(),
        paidCount: Number(newDatum.paidCount),
        released30: newDatum.released30,
        released40: newDatum.released40,
        releasedFinal: newDatum.releasedFinal,
        paidOut: newDatum.paidOut.toString(),
        comments: Number(newDatum.comments),
        ratingSum: Number(newDatum.ratingSum),
        ratingCount: Number(newDatum.ratingCount),
        allWatchMet: newDatum.allWatchMet,
        firstWatch: Number(newDatum.firstWatch),
        disputeBy: Number(newDatum.disputeBy),
      });
      await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" }).catch(() => {});
      const updated = await fetchEscrow(courseId);
      setEscrow(updated);
      router.push(`/course/${courseId}?paid=1`);
    } catch (e: any) {
      setLastError(e?.message || "Failed to add payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseFinal = async () => {
    if (!lucid || !escrow) return;
    setSubmitting(true);
    setLastError(null);
    setTxHash(null);
    try {
      const validatorScript = await getEscrowValidator();
      const validator = { type: "PlutusV3", script: validatorScript } as const;
      const scriptAddr = escrow.scriptAddress || (await getEscrowAddress(lucid, resolveNetwork()));
      const utxos = await lucid.utxosAt(scriptAddr);
      const datum = escrow;
      const redeemer: EscrowRedeemer = { ReleaseFinal: [] };
      const tx = await lucid
        .newTx()
        .collectFrom(utxos, Data.to(redeemer as any, EscrowRedeemerSchema))
        .attach.SpendingValidator(validator)
        .pay.ToAddress(walletAddress!, { lovelace: BigInt(datum.netTotal || "0") })
        .complete();
      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      setTxHash(hash);
      await syncEscrow(courseId, {
        status: "RELEASED",
        releasedFinal: true,
        paidOut: datum.netTotal,
      });
      const updated = await fetchEscrow(courseId);
      setEscrow(updated);
      router.push(`/course/${courseId}?paid=1`);
    } catch (e: any) {
      setLastError(e?.message || "Failed to release final funds");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshEscrow = async () => {
    const updated = await fetchEscrow(courseId);
    setEscrow(updated);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-4 sm:p-6">
        <p className="text-sm text-slate-600">Initializing wallet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 shadow-lg p-4 sm:p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="w-full">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs uppercase font-semibold text-slate-500 tracking-wide">Checkout</p>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  {typeof balance === "number" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Balance: {balance.toFixed(4)} ADA
                    </span>
                  )}
                  {walletAddress && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 truncate max-w-[240px]">
                      Wallet: {walletAddress}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h2 className="text-lg font-bold text-slate-900">{courseTitle}</h2>
                <p className="text-sm text-slate-600">Instructor: {authorName || "Unknown"}</p>
                <p className="text-sm text-slate-700 mt-1">Price: {(priceAda ?? grossAda ?? 0).toFixed(2)} ADA</p>
              </div>
            </div>
          </div>

          {lastError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{lastError}</div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Course price</p>
                <p className="text-lg font-semibold">{(priceAda ?? grossAda ?? 0).toFixed(2)} ADA</p>
              </div>
              <div>
                <p className="text-slate-500">Platform fee (7%)</p>
                <p className="text-lg font-semibold text-amber-700">{((grossAda ?? 0) * 0.07).toFixed(3)} ADA</p>
              </div>
              <div>
                <p className="text-slate-500">Net to instructor</p>
                <p className="text-lg font-semibold text-emerald-700">{((grossAda ?? 0) * 0.93).toFixed(3)} ADA</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              Funds lock into escrow. After successful payment you will be enrolled and redirected to the course page.
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600">Your payout address (defaults to your wallet)</p>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="addr_test..."
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Gross ADA</p>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={grossAda ?? ""}
                  onChange={(e) => setGrossAda(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Rating x10</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={ratingX10}
                  onChange={(e) => setRatingX10(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="0 - 100"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={watchMet} onChange={(e) => setWatchMet(e.target.checked)} />
                Watch met
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={commented} onChange={(e) => setCommented(e.target.checked)} />
                Commented
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-slate-700 space-y-1">
              <div className="font-semibold">Status: {escrow?.status || "PENDING"}</div>
              <div className="text-xs text-slate-500">Net Total: {escrow?.netTotal || 0}</div>
              <div className="text-xs text-slate-500">Paid Count: {escrow?.paidCount || 0}</div>
              <div className="text-xs text-slate-500">Final release window: {formatCountdown(disputeTimer)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCreate}
                disabled
                className="px-4 py-2 rounded-lg bg-gray-400 text-white font-semibold cursor-not-allowed"
                title="Escrow must be initialized once during course creation"
              >
                Escrow creation disabled
              </button>
              <button
                onClick={handleAddPayment}
                disabled={submitting || !walletAddress}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-60"
              >
                {submitting ? "Processing..." : "Add Payment"}
              </button>
              <button
                onClick={handleReleaseFinal}
                disabled={submitting || !walletAddress}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-60"
              >
                {submitting ? "Processing..." : "Release Final"}
              </button>
              <button
                onClick={refreshEscrow}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
