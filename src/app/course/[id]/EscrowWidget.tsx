'use client';

import React, { useEffect, useMemo, useState } from "react";
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
import { computeAddPaymentTransition, disputeCountdown, normalizePkh } from "../../lib/escrow-utils";
import { useLucid } from "../../context/LucidContext";

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

export function EscrowWidget({ courseId, isOwner, isPaid, priceAda, initialGrossAda, showFaucetLink = true }: Props) {
  const { lucid, walletAddress, loading, error, connectWallet, balance } = useLucid();
  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [grossAda, setGrossAda] = useState(initialGrossAda ?? priceAda ?? 1);
  const [receiverAddress, setReceiverAddress] = useState<string>("");
  const [watchMet, setWatchMet] = useState(true);
  const [ratingX10, setRatingX10] = useState(80);
  const [commented, setCommented] = useState(true);
  const [firstWatchAt, setFirstWatchAt] = useState<number>(Math.floor(Date.now() / 1000));
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
    if (!lucid) {
      await connectWallet();
      return;
    }
    setSubmitting(true);
    setLastError(null);
    setTxHash(null);
    try {
      const receiverPkh =
        escrow?.receiverPkh ||
        (receiverAddress ? normalizePkh(receiverAddress, "Instructor wallet") : null);
      if (!receiverPkh) {
        throw new Error("Receiver wallet address (or PKH) is required before creating escrow.");
      }
      const oracleEnv = escrow?.oraclePkh || process.env.NEXT_PUBLIC_ORACLE_PKH;
      if (!oracleEnv) {
        throw new Error("Oracle payment key hash missing. Set NEXT_PUBLIC_ORACLE_PKH.");
      }
      const oraclePkh = normalizePkh(oracleEnv, "Oracle key hash");

      const netAmount = calculateNetAmount(lovelaceAmount);
      const datum: EscrowDatum = {
        receiver: receiverPkh,
        oracle: oraclePkh,
        netTotal: netAmount,
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

      const scriptAddress = await getEscrowAddress(lucid, resolveNetwork());
      const tx = await lucid
        .newTx()
        .pay.ToContract(
          scriptAddress,
          { kind: "inline", value: Data.to(datum as any, EscrowDatumSchema) },
          { lovelace: netAmount }
        )
        .complete();
      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      setTxHash(hash);
      await syncEscrow(courseId, {
        scriptAddress,
        receiverPkh: datum.receiver,
        oraclePkh: datum.oracle,
        netTotal: datum.netTotal.toString(),
        paidCount: Number(datum.paidCount),
        paidOut: datum.paidOut.toString(),
        released30: datum.released30,
        released40: datum.released40,
        releasedFinal: datum.releasedFinal,
        comments: Number(datum.comments),
        ratingSum: Number(datum.ratingSum),
        ratingCount: Number(datum.ratingCount),
        allWatchMet: datum.allWatchMet,
        firstWatch: Number(datum.firstWatch),
        disputeBy: Number(datum.disputeBy),
        status: "PENDING",
      });
      await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" }).catch(() => {});
      const updated = await fetchEscrow(courseId);
      setEscrow(updated);
    } catch (e: any) {
      setLastError(e?.message || "Failed to create escrow");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayment = async () => {
    if (!lucid) {
      await connectWallet();
      return;
    }
    if (!escrow?.scriptAddress) {
      setLastError("No escrow script address found");
      return;
    }
    setSubmitting(true);
    setLastError(null);
    setTxHash(null);
    try {
      const scriptAddress = escrow.scriptAddress as string;
      const utxos = await lucid.utxosAt(scriptAddress);
      const targetUtxo = utxos.find((u: any) => {
        if (!u.datum) return false;
        try {
          const d = Data.from(u.datum, EscrowDatumSchema) as unknown as EscrowDatum;
          return escrow.receiverPkh ? d.receiver === escrow.receiverPkh : true;
        } catch {
          return false;
        }
      });
      if (!targetUtxo) {
        throw new Error("Escrow UTXO not found on-chain");
      }

      const currentDatum = Data.from(targetUtxo.datum as string, EscrowDatumSchema) as unknown as EscrowDatum;
      const { newDatum, immediatePayout } = computeAddPaymentTransition(currentDatum, netLovelace, {
        watchMet,
        ratingX10,
        commented,
        firstWatchAt: BigInt(firstWatchAt),
      });

      const redeemer: EscrowRedeemer = {
        AddPayment: {
          netAmount: netLovelace,
          watchMet,
          ratingX10: BigInt(ratingX10),
          commented,
          firstWatchAt: BigInt(firstWatchAt),
        },
      };

      const validatorScript = await getEscrowValidator();
      const validator = { type: "PlutusV3" as const, script: validatorScript };
      const payoutAddress =
        receiverAddress && receiverAddress.startsWith("addr")
          ? receiverAddress
          : walletAddress || (await lucid.wallet().address());

      const txBuilder = lucid
        .newTx()
        .collectFrom([targetUtxo], Data.to(redeemer as any, EscrowRedeemerSchema))
        .attach.SpendingValidator(validator)
        .addSigner(payoutAddress);

      if (immediatePayout > 0n) {
        txBuilder.pay.ToAddress(payoutAddress, { lovelace: immediatePayout });
      }

      const tx = await txBuilder
        .pay.ToContract(
          scriptAddress,
          { kind: "inline", value: Data.to(newDatum as any, EscrowDatumSchema) },
          { lovelace: newDatum.netTotal }
        )
        .complete({ setCollateral: 5_000_000n });

      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      setTxHash(hash);

      await syncEscrow(courseId, {
        scriptAddress,
        receiverPkh: escrow.receiverPkh,
        oraclePkh: escrow.oraclePkh,
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
      });
      await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" }).catch(() => {});
      const updated = await fetchEscrow(courseId);
      setEscrow(updated);
    } catch (e: any) {
      setLastError(e?.message || "Failed to add payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseFinal = async () => {
    if (!lucid) {
      await connectWallet();
      return;
    }
    if (!escrow?.scriptAddress) {
      setLastError("No escrow script address found");
      return;
    }
    setSubmitting(true);
    setLastError(null);
    setTxHash(null);
    try {
      const scriptAddress = escrow.scriptAddress as string;
      const utxos = await lucid.utxosAt(scriptAddress);
      const targetUtxo = utxos.find((u: any) => !!u.datum);
      if (!targetUtxo) throw new Error("Escrow UTXO not found");

      const currentDatum = Data.from(targetUtxo.datum as string, EscrowDatumSchema) as unknown as EscrowDatum;
      const payout = currentDatum.netTotal;
      const remainingSeconds = disputeCountdown(currentDatum.disputeBy).seconds;
      if (remainingSeconds > 0) {
        throw new Error(`Cannot release final yet. ${remainingSeconds} seconds remaining in dispute window.`);
      }
      const newDatum: EscrowDatum = {
        ...currentDatum,
        netTotal: 0n,
        paidOut: (currentDatum.paidOut ?? 0n) + payout,
        released40: true,
        releasedFinal: true,
      };

      const redeemer = Data.to("ReleaseFinal" as any, EscrowRedeemerSchema);
      const validatorScript = await getEscrowValidator();
      const validator = { type: "PlutusV3" as const, script: validatorScript };
      const receiverAddr =
        receiverAddress && receiverAddress.startsWith("addr")
          ? receiverAddress
          : walletAddress || (await lucid.wallet().address());

      const tx = await lucid
        .newTx()
        .validFrom(Number(currentDatum.disputeBy ?? 0n))
        .collectFrom([targetUtxo], redeemer)
        .attach.SpendingValidator(validator)
        .addSigner(receiverAddr)
        .pay.ToAddress(receiverAddr, { lovelace: payout })
        .pay.ToContract(
          scriptAddress,
          { kind: "inline", value: Data.to(newDatum as any, EscrowDatumSchema) },
          { lovelace: newDatum.netTotal }
        )
        .complete({ setCollateral: 5_000_000n });

      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      setTxHash(hash);

      await syncEscrow(courseId, {
        scriptAddress,
        receiverPkh: escrow.receiverPkh,
        oraclePkh: escrow.oraclePkh,
        netTotal: newDatum.netTotal.toString(),
        paidCount: Number(newDatum.paidCount ?? currentDatum.paidCount),
        paidOut: newDatum.paidOut?.toString?.() || "0",
        released30: newDatum.released30,
        released40: newDatum.released40,
        releasedFinal: newDatum.releasedFinal,
        comments: Number(newDatum.comments ?? currentDatum.comments ?? 0),
        ratingSum: Number(newDatum.ratingSum ?? currentDatum.ratingSum ?? 0),
        ratingCount: Number(newDatum.ratingCount ?? currentDatum.ratingCount ?? 0),
        allWatchMet: newDatum.allWatchMet ?? currentDatum.allWatchMet,
        firstWatch: Number(newDatum.firstWatch ?? currentDatum.firstWatch ?? 0),
        disputeBy: Number(newDatum.disputeBy ?? currentDatum.disputeBy ?? 0),
        status: "RELEASED",
      });
      const updated = await fetchEscrow(courseId);
      setEscrow(updated);
    } catch (e: any) {
      setLastError(e?.message || "Failed to release final");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isPaid) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Pay & Unlock (Preprod demo)</p>
          <p className="text-xs text-slate-500">
            Connect wallet, lock funds, and track payouts in real time.
          </p>
          {showFaucetLink && (
            <a
              href="https://docs.cardano.org/cardano-testnet/tools/faucet/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Need test ADA? Get it from the Preprod faucet.
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {typeof balance === "number" && (
            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              Balance: {balance.toFixed(4)} ADA
            </span>
          )}
          {walletAddress ? (
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Wallet: {walletAddress.slice(0, 10)}...
            </span>
          ) : (
            <button
              onClick={() => connectWallet()}
              className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white"
            >
              Connect wallet
            </button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold">Gross ADA</label>
          <input
            type="number"
            min={0}
            value={grossAda}
            onChange={(e) => setGrossAda(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={watchMet} onChange={(e) => setWatchMet(e.target.checked)} />
              Watch met
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={commented} onChange={(e) => setCommented(e.target.checked)} />
              Commented
            </label>
          </div>
          <label className="text-xs font-semibold">Rating x10</label>
          <input
            type="number"
            value={ratingX10}
            onChange={(e) => setRatingX10(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <label className="text-xs font-semibold">First watch at (epoch secs)</label>
          <input
            type="number"
            value={firstWatchAt}
            onChange={(e) => setFirstWatchAt(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <label className="text-xs font-semibold">Payout address (defaults to your wallet)</label>
          <input
            type="text"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="addr_test..."
          />
          <div className="text-xs text-slate-600 space-y-1">
            <p>Platform fee (7%): {(Number(feeLovelace) / 1_000_000).toFixed(4)} ADA</p>
            <p>Net to escrow: {(Number(netLovelace) / 1_000_000).toFixed(4)} ADA</p>
            <p>Immediate payout from this payment: {(Number(immediatePayoutPreview) / 1_000_000).toFixed(4)} ADA</p>
            <p>Remaining to reach 5 enrollments: {remainingToFive}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
            {escrow ? (
              <>
                <p>Status: {escrow.status ?? "N/A"}</p>
                <p>Net Total: {escrow.netTotal ?? "0"}</p>
                <p>Paid Out: {escrow.paidOut ?? "0"}</p>
                <p>Paid Count: {escrow.paidCount ?? 0}</p>
                <p>Released30: {escrow.released30 ? "yes" : "no"}</p>
                <p>Released40: {escrow.released40 ? "yes" : "no"}</p>
              </>
            ) : (
              <p>No escrow on record</p>
            )}
            {txHash && <p className="text-emerald-600 break-all">Tx: {txHash}</p>}
            {lastError && <p className="text-red-600">{lastError}</p>}
            {error && <p className="text-red-600">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-3 py-2 text-white text-sm disabled:opacity-60"
            >
              Create & Lock
            </button>
            <button
              onClick={handleAddPayment}
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-sm disabled:opacity-60"
            >
              Add Payment
            </button>
            <button
              onClick={handleReleaseFinal}
              disabled={submitting}
              className="rounded-lg bg-purple-600 px-3 py-2 text-white text-sm disabled:opacity-60"
            >
              Release Final
            </button>
            <button
              onClick={() => fetchEscrow(courseId).then(setEscrow)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Refresh
            </button>
          </div>
          {escrow?.disputeBy ? (
            <p className="text-xs text-slate-500">
              Final release window: {disputeTimer.days}d {disputeTimer.hours}h {disputeTimer.minutes}m remaining
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
