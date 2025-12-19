// This component drives the creator’s escrow withdrawal dashboard.  It loads
// course metadata, the current escrow snapshot, and derived engagement metrics
// (watch percentage, rating, comments) for a given course.  It displays
// progress toward the three payout milestones (initial 30%, engagement‑based
// 40%, and final 30% after a dispute window) and exposes controls to
// evaluate metrics and withdraw funds when eligible.  When a withdrawal is
// executed, the on‑chain transaction is built and submitted via Lucid.
// Afterwards the off‑chain escrow record is synchronised via
// `/api/escrow/[courseId]/sync` so that the database reflects the new
// `released30`, `released40`, or `releasedFinal` flags along with the updated
// `netTotal` and `paidOut` balances.  The `sync` endpoint should ONLY be
// invoked after a release transaction has occurred; initial deposits should
// be recorded via `/api/escrow/create` after checkout rather than using
// `sync`.

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLucid } from "../../context/LucidContext";
import { Data } from "@lucid-evolution/lucid";
import type { UTxO } from "@lucid-evolution/lucid";
import EscrowSimulator from "../component/EscrowSimulator";
import { normalizePkh, hashCourseId } from "../../lib/escrow-utils";

// Define the redeemer schema for your validator.  These must match the
// contract’s expected constructors exactly.  Typing against this schema
// prevents passing invalid redeemer strings.
const EscrowRedeemerSchema = Data.Enum([
  Data.Object({
    AddPayment: Data.Tuple([
      Data.Object({
        net_amount: Data.Integer(),
        watch_met: Data.Boolean(),
        rating_x10: Data.Integer(),
        commented: Data.Boolean(),
        first_watch_at: Data.Integer(),
      }),
    ]),
  }),
  Data.Object({ ReleaseInitial: Data.Tuple([]) }),
  Data.Object({ ReleaseMetrics40: Data.Tuple([]) }),
  Data.Object({ ReleaseFinal: Data.Tuple([]) }),
  Data.Object({ Refund: Data.Tuple([]) }),
  Data.Object({ DisputeHold: Data.Tuple([]) }),
]);

/**
 * Types returned from the escrow snapshot endpoint.  Numeric fields are
 * converted to JS numbers after JSON parsing for ease of use.
 */
type EscrowState = {
  netTotal: number;
  paidCount: number;
  paidOut: number;
  released30: boolean;
  released40: boolean;
  releasedFinal: boolean;
  status: string | null;
  ratingSum: number;
  ratingCount: number;
  comments: number;
  allWatchMet: boolean;
  firstWatch: number;
  disputeBy: number;
  scriptAddress: string | null;
  receiverPkh?: string | null;
  oraclePkh?: string | null;
};

/**
 * Engagement metrics derived from watch progress and rating data.  The
 * engagementScore is scaled from 0–100 based on watch percentage, average
 * rating (interpreted on a 10‑point scale), and presence of comments.
 */
type EngagementMetrics = {
  totalWatchSeconds: number;
  avgWatchPercentage: number;
  totalComments: number;
  totalRatings: number;
  avgRating: number;
  engagementScore: number;
};

/**
 * Escrow withdrawal dashboard.  This component orchestrates the state
 * necessary to display the creator’s view of their course escrow.  It
 * supports evaluating the 60% engagement metric and withdrawing funds
 * when milestones are met.  After each on‑chain withdrawal transaction,
 * it calls the `/api/escrow/[courseId]/sync` endpoint to persist the new
 * release flags and balances.  DO NOT call `sync` when recording a new
 * payment from a student—use `/api/escrow/create` instead (see checkout
 * logic).
 */
export default function EscrowWithdrawalDashboard() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId;
  const router = useRouter();
  const {
    lucid,
    walletAddress,
    balance,
    toppingUp,
    requestTopup,
    loading: walletLoading,
    connectWallet,
    error: walletError,
  } = useLucid();

  // Local state for course metadata, escrow snapshot, and engagement data
  const [course, setCourse] = useState<any | null>(null);
  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);

  // UI state for loading and transaction feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{
    type: "idle" | "building" | "signing" | "submitting" | "success" | "error";
    message: string;
    txHash?: string;
  }>({ type: "idle", message: "" });
  const walletReady = !!lucid && !!walletAddress;
  const courseIdHash = courseId ? hashCourseId(courseId) : null;
  const [chainSnapshot, setChainSnapshot] = useState<{
    paidCount: number;
    lockedLovelace: string;
    released30: boolean;
    released40: boolean;
    releasedFinal: boolean;
    receiverPkh: string;
    oraclePkh: string;
    firstWatch: number;
    disputeBy: number;
  } | null>(null);
  const [chainSnapshotError, setChainSnapshotError] = useState<string | null>(null);
  const [devFixBusy, setDevFixBusy] = useState(false);
  const [syncedChainTimes, setSyncedChainTimes] = useState(false);

  // Load the course details, escrow snapshot, and engagement metrics when
  // courseId changes.  The engagement metrics are derived from the server’s
  // watch progress endpoint and the current escrow rating/comment counts.
  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch course data
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (!courseRes.ok) throw new Error("Failed to load course");
        const courseData = await courseRes.json();
        setCourse({
          id: courseData.id,
          title: courseData.title,
          description: courseData.description,
          coverImage: courseData.coverImage,
          priceAda: Number(courseData.priceAda ?? 0),
          visibility: courseData.visibility,
          totalDuration: Number(courseData.totalDurationSeconds ?? courseData.totalDuration ?? 0),
          enrollmentCount: courseData.enrollmentCount ?? 0,
          videoCount: Number(courseData.videoCount ?? courseData._count?.contents ?? 0),
          averageRating: courseData.averageRating,
        });

        // Fetch escrow snapshot
        const escrowRes = await fetch(`/api/escrow/${courseId}`);
        if (!escrowRes.ok) throw new Error("Failed to load escrow");
        const escrowData = await escrowRes.json();
        setEscrow({
          netTotal: Number(escrowData.netTotal ?? 0),
          paidCount: Number(escrowData.paidCount ?? 0),
          paidOut: Number(escrowData.paidOut ?? 0),
          released30: !!escrowData.released30,
          released40: !!escrowData.released40,
          releasedFinal: !!escrowData.releasedFinal,
          status: escrowData.status ?? "PENDING",
          ratingSum: Number(escrowData.ratingSum ?? 0),
          ratingCount: Number(escrowData.ratingCount ?? 0),
          comments: Number(escrowData.comments ?? 0),
          allWatchMet: !!escrowData.allWatchMet,
          firstWatch: Number(escrowData.firstWatch ?? 0),
          disputeBy: Number(escrowData.disputeBy ?? 0),
          scriptAddress: escrowData.scriptAddress || null,
          receiverPkh: escrowData.receiverPkh ?? null,
          oraclePkh: escrowData.oraclePkh ?? null,
        });

        // Derive engagement metrics.  You can compute averages on the fly
        // or call a dedicated endpoint that returns these values already
        // aggregated.  Here we compute watch and rating averages locally.
        const totalDuration = Number(courseData.totalDurationSeconds ?? courseData.totalDuration ?? 0);
        const enrollmentCount = courseData.enrollmentCount ?? 0;
        let totalWatchSeconds = 0;
        const watchRes = await fetch(`/api/courses/${courseId}/progress`);
        if (watchRes.ok) {
          const watchData = await watchRes.json();
          totalWatchSeconds = watchData.totalWatchSeconds ?? 0;
        }
        const avgWatchPct =
          totalDuration > 0 && enrollmentCount > 0
            ? (totalWatchSeconds / (totalDuration * enrollmentCount)) * 100
            : 0;
        const avgRating =
          escrowData.ratingCount > 0
            ? escrowData.ratingSum / escrowData.ratingCount / 10
            : 0;
        // Engagement score: 40 points for watch, 40 for rating, 20 for comments
        const watchScore = Math.min(avgWatchPct / 60, 1) * 40;
        const ratingScore = Math.min(avgRating / 6, 1) * 40;
        const commentScore = Math.min(escrowData.comments / 1, 1) * 20;
        const engagementScore = Math.round(
          watchScore + ratingScore + commentScore
        );
        setEngagement({
          totalWatchSeconds,
          avgWatchPercentage: avgWatchPct,
          totalComments: escrowData.comments,
          totalRatings: escrowData.ratingCount,
          avgRating,
          engagementScore,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  // If escrow exists but scriptAddress is missing (older rows), derive it from the contract
  // and sync it so withdrawals can proceed.
  useEffect(() => {
    if (!courseId || !escrow || escrow.scriptAddress || !lucid) return;
    (async () => {
      try {
        const { getEscrowAddress, resolveNetwork } = await import("../../lib/contracts");
        const addr = await getEscrowAddress(lucid, resolveNetwork());
        setEscrow((prev) => (prev ? { ...prev, scriptAddress: addr } : prev));
        await fetch(`/api/escrow/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            scriptAddress: addr,
            netTotal: escrow.netTotal,
            paidCount: escrow.paidCount,
            paidOut: escrow.paidOut,
            released30: escrow.released30,
            released40: escrow.released40,
            releasedFinal: escrow.releasedFinal,
            comments: escrow.comments,
            ratingSum: escrow.ratingSum,
            ratingCount: escrow.ratingCount,
            allWatchMet: escrow.allWatchMet,
            firstWatch: escrow.firstWatch,
            disputeBy: escrow.disputeBy,
            status: escrow.status,
          }),
        });
      } catch (err) {
        console.warn("Failed to backfill script address", err);
      }
    })();
  }, [courseId, escrow, lucid]);

  // Convert lovelace to ADA (with fixed decimals) for display
  const toAda = (lovelace: number) => (lovelace / 1_000_000).toFixed(2);
  const toAdaFromBig = (lovelace: bigint) => (Number(lovelace) / 1_000_000).toFixed(6);

  // Load on-chain snapshot for the escrow UTxO (best-effort) so UI reflects actual validator state.
  useEffect(() => {
    if (!lucid || !escrow?.scriptAddress) return;
    let active = true;
    (async () => {
      try {
        setChainSnapshotError(null);
        const scriptUtxos: UTxO[] = await lucid.utxosAt(escrow.scriptAddress!);
        if (!active) return;
        if (!scriptUtxos.length) {
          setChainSnapshot(null);
          return;
        }
        const { EscrowDatumSchema } = await import("../../lib/contracts");
        const EscrowDatum = EscrowDatumSchema as any;
        const parsed = scriptUtxos
          .filter((u) => u.datum)
          .map((u) => {
            try {
              const datum = Data.from(u.datum!, EscrowDatum) as any;
              return { utxo: u, datum };
            } catch {
              return null;
            }
          })
          .filter(Boolean) as Array<{ utxo: UTxO; datum: any }>;

        const byCourse = courseIdHash
          ? parsed.filter((c) => String(c.datum?.courseId ?? "") === courseIdHash)
          : parsed;
        const byReceiver = escrow.receiverPkh
          ? byCourse.filter((c) => String(c.datum?.receiver ?? "") === String(escrow.receiverPkh))
          : byCourse;
        const byOracle = escrow.oraclePkh
          ? byReceiver.filter((c) => String(c.datum?.oracle ?? "") === String(escrow.oraclePkh))
          : byReceiver;

        if (byOracle.length + byReceiver.length === 0 || byCourse.length === 0) {
          setChainSnapshot(null);
          setChainSnapshotError("Escrow UTxO for this course not found on-chain.");
          return;
        }
        if (byCourse.length > 1) {
          setChainSnapshotError("Multiple escrow UTxOs found for this course. Please consolidate.");
        }

        const chosen = (byOracle.length ? byOracle : byReceiver)[0];

        if (!chosen) {
          setChainSnapshot(null);
          return;
        }

        const locked = BigInt(chosen.datum?.netTotal ?? 0n);
        setChainSnapshot({
          paidCount: Number(chosen.datum?.paidCount ?? 0n),
          lockedLovelace: locked.toString(),
          released30: !!chosen.datum?.released30,
          released40: !!chosen.datum?.released40,
          releasedFinal: !!chosen.datum?.releasedFinal,
          receiverPkh: String(chosen.datum?.receiver ?? ""),
          oraclePkh: String(chosen.datum?.oracle ?? ""),
          firstWatch: Number(chosen.datum?.firstWatch ?? 0n),
          disputeBy: Number(chosen.datum?.disputeBy ?? 0n),
        });
      } catch (e: any) {
        if (!active) return;
        setChainSnapshot(null);
        setChainSnapshotError(e?.message || "Failed to load on-chain escrow snapshot");
      }
    })();

    return () => {
      active = false;
    };
  }, [lucid, escrow?.scriptAddress, escrow?.receiverPkh, escrow?.oraclePkh]);

  // Backfill disputeBy/firstWatch from on-chain datum if older rows were overwritten to 0.
  useEffect(() => {
    if (!courseId || !escrow || !chainSnapshot || syncedChainTimes) return;
    if (escrow.disputeBy && escrow.disputeBy > 0) {
      setSyncedChainTimes(true);
      return;
    }
    if (!chainSnapshot.disputeBy || chainSnapshot.disputeBy <= 0) return;
    (async () => {
      try {
        await fetch(`/api/escrow/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            firstWatch: chainSnapshot.firstWatch,
            disputeBy: chainSnapshot.disputeBy,
          }),
        });
      } catch (e) {
        console.warn("Failed to backfill disputeBy from chain", e);
      } finally {
        setSyncedChainTimes(true);
      }
    })();
  }, [courseId, escrow, chainSnapshot, syncedChainTimes]);

  // Compute the days left in the dispute window.  Once `released40` is true
  // and the window has passed, the final 30% becomes withdrawable.
  const normalizeUnixMs = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    // Heuristic: seconds timestamps are ~10 digits; ms timestamps are ~13 digits.
    return value < 10_000_000_000 ? value * 1000 : value;
  };
  const nowMs = Date.now();
  const disputeByMs = chainSnapshot?.disputeBy
    ? normalizeUnixMs(chainSnapshot.disputeBy)
    : escrow
    ? normalizeUnixMs(escrow.disputeBy)
    : 0;
  const daysRemaining = escrow
    ? Math.max(0, Math.floor((disputeByMs - nowMs) / 86_400_000))
    : 0;

  const effectivePaidCount = chainSnapshot?.paidCount ?? escrow?.paidCount ?? 0;
  const effectiveReleased30 = chainSnapshot?.released30 ?? escrow?.released30 ?? false;
  const effectiveReleased40 = chainSnapshot?.released40 ?? escrow?.released40 ?? false;
  const effectiveReleasedFinal = chainSnapshot?.releasedFinal ?? escrow?.releasedFinal ?? false;

  // Progress calculations for milestone bars.  If the escrow state is not yet
  // loaded, default to 0.
  const milestone30Progress = escrow
    ? Math.min((effectivePaidCount / 5) * 100, 100)
    : 0;
  const milestone40Progress = engagement ? engagement.engagementScore : 0;

  // Eligibility flags for each withdrawal.  30%: at least 5 payments and not yet
  // released.  40%: initial 30% has been released, metrics met, and not yet
  // released.  Final: 40% released, window elapsed, final not yet released.
  const canWithdraw30 = escrow
    ? effectivePaidCount >= 5 && !effectiveReleased30
    : false;
  const canWithdraw40 =
    escrow && engagement
      ? effectiveReleased30 &&
        !effectiveReleased40 &&
        engagement.engagementScore >= 100
      : false;
  const canWithdrawFinal = escrow
    ? effectiveReleased40 &&
      !effectiveReleasedFinal &&
      nowMs >= disputeByMs
    : false;

  /**
   * Evaluate the engagement metrics on the server.  This calls
   * `/api/escrow/[courseId]/evaluate`, which recomputes the average watch
   * percentage and ratings across enrolled students and sets the
   * `released40` flag if the 60% threshold is met.  It does not modify the
   * chain; it only updates the off‑chain record.  After a successful call
   * the page reloads to show updated eligibility status.
   */
  const handleEvaluate40 = async () => {
    try {
      setTxStatus({ type: "building", message: "Evaluating metrics..." });
      const res = await fetch(`/api/escrow/${courseId}/evaluate`, {
        method: "GET",
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      const eligible = data?.eligibility?.metrics40 ?? data?.eligibility?.initial30 ?? false;
      if (eligible) {
        setTxStatus({
          type: "success",
          message: "40% release unlocked! You can now withdraw.",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setTxStatus({
          type: "error",
          message: `Not eligible yet. Watch: ${data?.metrics?.avgWatchPct ?? "0"}%, Engagement: ${
            data?.metrics?.comments > 0 && data?.metrics?.ratingCount > 0 ? "Yes" : "No"
          }`,
        });
      }
    } catch (err: any) {
      setTxStatus({
        type: "error",
        message: err?.message || "Evaluation failed",
      });
    }
  };

  /**
   * Withdraw funds from the escrow.  This handler builds and submits the
   * on‑chain transaction to release either 30%, 40%, or the final 30% of
   * escrowed funds.  After a successful submission, it calls
   * `/api/escrow/[courseId]/sync` with the appropriate release flag and
   * updated balances.  The sync call ensures the off‑chain state mirrors
   * what happened on chain.  Note that the initial deposit is recorded via
   * `/api/escrow/create` in the checkout flow; only call sync after an actual
   * release.
   */
  const handleWithdraw = async (releaseType: "30" | "40" | "final") => {
    if (!escrow?.scriptAddress) {
      setTxStatus({ type: "error", message: "Escrow is not ready yet. Wait for the first payment to lock funds on-chain." });
      return;
    }
    if (!lucid || !walletAddress) {
      setTxStatus({ type: "error", message: "Wallet not connected. Click Connect wallet and try again." });
      connectWallet();
      return;
    }
    try {
      setTxStatus({ type: "building", message: "Building transaction..." });
      // Dynamically import your Plutus validator.  This must match the
      // compiled validator used to lock funds on chain.
      const { getEscrowValidator } = await import("../../lib/contracts");
      const validatorScript = await getEscrowValidator();
      const validator = { type: "PlutusV3" as const, script: validatorScript };
      // Retrieve the script UTxOs.  We collect the one with a datum (the
      // escrow record) to spend.
      const scriptUtxos: UTxO[] = await lucid.utxosAt(escrow.scriptAddress);
      if (scriptUtxos.length === 0)
        throw new Error("No UTxOs at script address");

      const { EscrowDatumSchema } = await import("../../lib/contracts");
      const EscrowDatum = EscrowDatumSchema as any;
      const candidates = scriptUtxos
        .filter((u) => u.datum)
        .map((u) => {
          try {
            const datum = Data.from(u.datum!, EscrowDatum) as any;
            return { utxo: u, datum };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<{ utxo: UTxO; datum: any }>;

      const byCourse = courseIdHash
        ? candidates.filter((c) => String(c.datum?.courseId ?? "") === courseIdHash)
        : candidates;
      if (byCourse.length === 0) throw new Error("Escrow UTxO not found for this course (course_id mismatch).");
      if (byCourse.length > 1) throw new Error("Multiple escrow UTxOs found for this course; resolve before withdrawing.");

      const chosen = byCourse[0];

      const escrowUtxo = chosen.utxo;
      const currentDatum = chosen.datum;
      const onChainPaidCount = BigInt(currentDatum?.paidCount ?? 0n);
      const datumNetTotal = BigInt(currentDatum?.netTotal ?? 0n);

      if (datumNetTotal <= 0n) throw new Error("Nothing locked on-chain yet for this escrow.");
      if (releaseType === "30" && onChainPaidCount < 5n) {
        throw new Error(`On-chain paidCount is ${onChainPaidCount.toString()} (needs 5 to release 30%).`);
      }

      const connectedPkh = normalizePkh(walletAddress, "Connected wallet");
      if (String(currentDatum?.receiver ?? "") !== connectedPkh) {
        throw new Error("Connected wallet does not match the payout wallet used to create the escrow (receiver PKH mismatch).");
      }
      // Choose redeemer according to the milestone.  The names MUST match
      // EscrowRedeemerSchema exactly.
      const redeemerObj =
        releaseType === "30"
          ? ({ ReleaseInitial: [] } as const)
          : releaseType === "40"
          ? ({ ReleaseMetrics40: [] } as const)
          : ({ ReleaseFinal: [] } as const);
      const redeemer = Data.to(redeemerObj as any, EscrowRedeemerSchema);
      // Calculate payout using datum.netTotal (validator checks net_total field).
      let payoutLovelace = 0n;
      if (releaseType === "30") {
        payoutLovelace = (datumNetTotal * 30n) / 100n;
      } else if (releaseType === "40") {
        payoutLovelace = (datumNetTotal * 40n) / 100n;
      } else {
        payoutLovelace = datumNetTotal;
      }
      if (payoutLovelace <= 0n) throw new Error("Nothing to withdraw yet.");

      const nextNetTotal = datumNetTotal - payoutLovelace;
      const nextPaidOut = BigInt(currentDatum?.paidOut ?? 0n) + payoutLovelace;
      const updatedDatum = {
        ...currentDatum,
        netTotal: nextNetTotal,
        paidOut: nextPaidOut,
        released30: releaseType === "30" ? true : !!currentDatum?.released30,
        released40: releaseType === "40" ? true : !!currentDatum?.released40,
        releasedFinal: releaseType === "final" ? true : !!currentDatum?.releasedFinal,
        courseId: currentDatum.courseId,
      };

      // Determine how much remains at the script after withdrawing the payout.
      const remainingLovelace = nextNetTotal;
      setTxStatus({ type: "building", message: "Constructing transaction..." });
      // Build the transaction.  Collect the escrow UTxO, attach the
      // validator, pay the creator, and optionally pay the remainder back to
      // the script with its datum.  We avoid using `.apply()` here to
      // satisfy TypeScript’s `TxBuilder` typing.
      let txBuilder = lucid
        .newTx()
        .collectFrom([escrowUtxo], redeemer)
        .attach.SpendingValidator(validator)
        .pay.ToAddress(walletAddress, { lovelace: payoutLovelace });
      // If there’s enough Lovelace left (> 2 ADA) keep the script alive by
      // paying back the remainder along with the datum.  Otherwise the UTxO
      // will be consumed entirely.
      if (remainingLovelace > 2_000_000n) {
        txBuilder = txBuilder.pay.ToAddressWithData(
          escrow.scriptAddress!,
          { kind: "inline", value: Data.to(updatedDatum, EscrowDatum) },
          { lovelace: remainingLovelace }
        );
      }
      // Add validity range (optional) and build
      const now = Date.now();
      const tx = await txBuilder
        .validFrom(now)
        .validTo(now + 300_000)
        .complete();
      setTxStatus({
        type: "signing",
        message: "Please sign the transaction...",
      });
      const signedTx = await tx.sign.withWallet().complete();
      setTxStatus({
        type: "submitting",
        message: "Submitting to blockchain...",
      });
      const txHash = await signedTx.submit();
      setTxStatus({
        type: "success",
        message: `Transaction submitted! Hash: ${txHash.slice(0, 10)}...`,
        txHash,
      });
      // Persist the release off‑chain by calling sync.  Update the relevant
      // release flag and netTotal/paidOut.  DO NOT call sync for initial
      // deposits—those are handled by /api/escrow/create in the checkout
      // flow.
      const remainingForDb = remainingLovelace > 2_000_000n ? remainingLovelace : 0n;
      const newPaidOut = escrow.paidOut + Number(payoutLovelace);
      const newNetTotal = Number(remainingForDb);
      await fetch(`/api/escrow/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          [`released${
            releaseType === "30" ? "30" : releaseType === "40" ? "40" : "Final"
          }`]: true,
          paidOut: newPaidOut,
          netTotal: newNetTotal,
        }),
      });
      // Reload to reflect the updated escrow state
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setTxStatus({
        type: "error",
        message: err?.message || "Transaction failed",
      });
    }
  };

  /**
   * DEV FIX: if off-chain paidCount is >= 5 but on-chain paidCount is lower
   * (because earlier checkouts created multiple UTxOs), you can increment the
   * on-chain paidCount by performing an AddPayment with net_amount=0.
   *
   * This is only useful on testnet/dev. The 5th increment triggers the contract's
   * built-in 30% payout automatically (per AddPayment logic).
   */
  const handleDevAddPaymentZero = async () => {
    if (!lucid || !walletAddress || !escrow?.scriptAddress) {
      setTxStatus({ type: "error", message: "Wallet/escrow not ready." });
      return;
    }
    if (!chainSnapshot) {
      setTxStatus({ type: "error", message: "On-chain escrow snapshot not found." });
      return;
    }
    if (chainSnapshot.paidCount >= 5) {
      setTxStatus({ type: "success", message: "On-chain paidCount is already >= 5." });
      return;
    }

    setDevFixBusy(true);
    try {
      setTxStatus({ type: "building", message: "Building dev AddPayment (0 ADA)..." });
      const { getEscrowValidator, EscrowDatumSchema } = await import("../../lib/contracts");
      const validatorScript = await getEscrowValidator();
      const validator = { type: "PlutusV3" as const, script: validatorScript };
      const EscrowDatum = EscrowDatumSchema as any;

      const scriptUtxos: UTxO[] = await lucid.utxosAt(escrow.scriptAddress);
      const candidates = scriptUtxos
        .filter((u) => u.datum)
        .map((u) => {
          try {
            const datum = Data.from(u.datum!, EscrowDatum) as any;
            return { utxo: u, datum };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<{ utxo: UTxO; datum: any }>;

      const byCourse = courseIdHash
        ? candidates.filter((c) => String(c.datum?.courseId ?? "") === courseIdHash)
        : candidates;
      if (byCourse.length === 0) throw new Error("Escrow UTxO not found for this course (course_id mismatch).");
      if (byCourse.length > 1) throw new Error("Multiple escrow UTxOs found for this course; resolve before proceeding.");

      const chosen = byCourse[0];

      const escrowUtxo = chosen.utxo;
      const currentDatum = chosen.datum;

      const currentPaidCount = BigInt(currentDatum?.paidCount ?? 0n);
      const currentNetTotal = BigInt(currentDatum?.netTotal ?? 0n);
      const currentPaidOut = BigInt(currentDatum?.paidOut ?? 0n);
      const connectedPkh = normalizePkh(walletAddress, "Connected wallet");
      if (String(currentDatum?.receiver ?? "") !== connectedPkh) {
        throw new Error(
          "Connect the instructor payout wallet used to create this escrow (receiver PKH mismatch) to run this dev fix."
        );
      }

      const netAmount = 0n;
      const newCount = currentPaidCount + 1n;
      const immediatePayout = newCount === 5n ? (currentNetTotal + netAmount) * 30n / 100n : 0n;

      const nextDatum = {
        ...currentDatum,
        netTotal: currentNetTotal + netAmount - immediatePayout,
        paidCount: newCount,
        paidOut: currentPaidOut + immediatePayout,
        released30: newCount >= 5n ? true : !!currentDatum?.released30,
        courseId: currentDatum.courseId,
      };

      const redeemer = Data.to(
        {
          AddPayment: [
            {
              net_amount: netAmount,
              watch_met: true,
              rating_x10: 0n,
              commented: false,
              first_watch_at: (BigInt(currentDatum?.firstWatch ?? 0n) || BigInt(Date.now())) as bigint,
            },
          ],
        } as any,
        EscrowRedeemerSchema
      );

      let txBuilder = lucid
        .newTx()
        .collectFrom([escrowUtxo], redeemer)
        .attach.SpendingValidator(validator);

      if (immediatePayout > 0n) {
        txBuilder = txBuilder.pay.ToAddress(walletAddress, { lovelace: immediatePayout });
      }

      txBuilder = txBuilder.pay.ToContract(
        escrow.scriptAddress!,
        { kind: "inline", value: Data.to(nextDatum, EscrowDatum) },
        { lovelace: BigInt(nextDatum.netTotal ?? 0n) }
      );

      const tx = await txBuilder
        .validFrom(Date.now())
        .validTo(Date.now() + 300_000)
        .complete();

      setTxStatus({ type: "signing", message: "Please sign the dev AddPayment tx..." });
      const signedTx = await tx.sign.withWallet().complete();
      setTxStatus({ type: "submitting", message: "Submitting to blockchain..." });
      const txHash = await signedTx.submit();
      setTxStatus({ type: "success", message: `Submitted. Tx: ${txHash.slice(0, 10)}...`, txHash });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setTxStatus({ type: "error", message: e?.message || "Dev AddPayment failed" });
    } finally {
      setDevFixBusy(false);
    }
  };

  /**
   * Resolve or refund a disputed escrow from the dashboard. This calls
   * `/api/escrow/[courseId]/resolve` with an action of "release" (pay out)
   * or "refund" (return to students) and updates the local status badge.
   */
  const handleResolve = async (action: "release" | "refund") => {
    if (!courseId) return;
    try {
      setTxStatus({
        type: "building",
        message: action === "release" ? "Releasing funds..." : "Issuing refund...",
      });
      const res = await fetch(`/api/escrow/${courseId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Resolve failed");
      const json = await res.json();
      setEscrow((prev) =>
        prev
          ? {
              ...prev,
              status: json.status ?? prev.status,
              releasedFinal: json.releasedFinal ?? prev.releasedFinal,
            }
          : prev
      );
      setTxStatus({
        type: "success",
        message: action === "release" ? "Marked as released" : "Marked as refunded",
      });
    } catch (err: any) {
      setTxStatus({
        type: "error",
        message: err?.message || "Failed to resolve dispute",
      });
    }
  };

  // Render loading and error states up front
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }
  if (error || !course || !escrow || !engagement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <p className="text-red-800 dark:text-red-400">
              {error || "Failed to load course data"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation back to dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ← Back to Dashboard
        </button>

        {/* Course header with metadata */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            {course.coverImage && (
              <img
                src={course.coverImage}
                alt={course.title}
                className="w-full sm:w-32 h-40 sm:h-32 rounded-xl object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
                    {course.title}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">
                    {course.description || "No description."}
                  </p>
                </div>
                <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 flex-wrap">
                  <span
                    className={
                      "px-3 py-1 rounded-full text-sm font-semibold " +
                      (course.visibility === "PUBLISHED"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300")
                    }
                  >
                    {course.visibility}
                  </span>
                  <span
                    className={
                      "px-3 py-1 rounded-full text-xs font-semibold " +
                      (escrow.status === "DISPUTED"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : escrow.status === "RELEASED"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : escrow.status === "REFUNDED"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300")
                    }
                  >
                    Status: {escrow.status ?? "PENDING"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {course.enrollmentCount}
                  </span>{" "}
                  students
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {course.videoCount}
                  </span>{" "}
                  videos
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {course.priceAda}
                  </span>{" "}
                  ADA
                </div>
                {typeof course.averageRating === "number" && (
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {course.averageRating.toFixed(1)}
                    </span>{" "}
                    rating
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction status banner */}
        {txStatus.type !== "idle" && (
          <div
            className={
              "rounded-2xl p-4 border " +
              (txStatus.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : txStatus.type === "error"
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800")
            }
          >
            <div className="flex items-center gap-3">
              {["building", "signing", "submitting"].includes(
                txStatus.type
              ) && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
              <div className="flex-1">
                <p
                  className={
                    "font-semibold " +
                    (txStatus.type === "success"
                      ? "text-emerald-800 dark:text-emerald-300"
                      : txStatus.type === "error"
                      ? "text-red-800 dark:text-red-300"
                      : "text-blue-800 dark:text-blue-300")
                  }
                >
                  {txStatus.message}
                </p>
                {txStatus.txHash && (
                  <a
                    href={`https://preprod.cardanoscan.io/transaction/${txStatus.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View on Cardanoscan
                  </a>
                )}
              </div>
              {["success", "error"].includes(txStatus.type) && (
                <button
                  onClick={() => setTxStatus({ type: "idle", message: "" })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Wallet status */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 max-w-3xl">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Wallet connection</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {walletReady ? (
                  <>
                    Connected: <span className="break-all">{walletAddress}</span>
                  </>
                ) : walletLoading ? (
                  "Initializing wallet..."
                ) : (
                  "Connect your payout wallet before withdrawing funds."
                )}
              </p>
              {typeof balance === "number" && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Balance: <span className="font-semibold">{balance.toFixed(6)} ADA</span>
                </p>
              )}
              {chainSnapshot && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  On-chain locked: <span className="font-semibold">{toAdaFromBig(BigInt(chainSnapshot.lockedLovelace))} ADA</span>{" "}
                  | paidCount: <span className="font-semibold">{chainSnapshot.paidCount}</span>
                </p>
              )}
              {chainSnapshotError && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  On-chain snapshot error: {chainSnapshotError}
                </p>
              )}
              {walletError && (
                <p className="text-xs text-red-600 dark:text-red-300">Wallet error: {walletError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => connectWallet()}
                disabled={walletLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {walletLoading ? "Connecting..." : walletReady ? "Reconnect" : "Connect wallet"}
              </button>
              {walletReady && typeof balance === "number" && balance <= 0 && (
                <button
                  onClick={() => requestTopup({ ada: 5 })}
                  disabled={toppingUp}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {toppingUp ? "Requesting..." : "Request Test ADA"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Balance overview */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Escrow Balance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                RELEASED
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {toAda(escrow.paidOut)} ADA
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                LOCKED
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {chainSnapshot ? toAdaFromBig(BigInt(chainSnapshot.lockedLovelace)) : toAda(escrow.netTotal)} ADA
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                TOTAL
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {toAda(escrow.netTotal + escrow.paidOut)} ADA
              </p>
            </div>
          </div>
          {/* Visual representation of released tranches */}
          <div className="relative h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex">
            {effectiveReleased30 && (
              <div
                className="bg-emerald-500 flex items-center justify-center text-sm font-semibold text-white"
                style={{ width: "30%" }}
              >
                30% Released
              </div>
            )}
            {effectiveReleased40 && (
              <div
                className="bg-blue-500 flex items-center justify-center text-sm font-semibold text-white"
                style={{ width: "40%" }}
              >
                40% Released
              </div>
            )}
            {!effectiveReleasedFinal && (
              <div className="bg-amber-500 flex items-center justify-center text-sm font-semibold text-white flex-1">
                {effectiveReleased30 && effectiveReleased40
                  ? "30% Locked"
                  : "Pending"}
              </div>
            )}
          </div>
        </div>

        {/* Milestone progress and action buttons */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Initial 30% milestone */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  30% Release
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  5 student enrollments
                </p>
              </div>
              {effectiveReleased30 && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  Complete
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Current Enrollments:
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {effectivePaidCount} / 5
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${milestone30Progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {effectiveReleased30
                  ? "Funds released to instructor"
                  : `${Math.max(0, 5 - effectivePaidCount)} more enrollments needed`}
              </p>
              {chainSnapshot &&
                escrow.paidCount >= 5 &&
                chainSnapshot.paidCount < 5 &&
                !effectiveReleased30 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-semibold mb-1">On-chain escrow state is behind your DB</p>
                    <p>
                      Off-chain enrollments: <span className="font-semibold">{escrow.paidCount}</span> | On-chain paidCount:{" "}
                      <span className="font-semibold">{chainSnapshot.paidCount}</span>. Withdrawals require on-chain paidCount = 5.
                    </p>
                    <button
                      onClick={handleDevAddPaymentZero}
                      disabled={devFixBusy || txStatus.type !== "idle" || !walletReady}
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold"
                    >
                      {devFixBusy
                        ? "Submitting..."
                        : `Dev fix: increment on-chain paidCount (${chainSnapshot.paidCount}/5)`}
                    </button>
                  </div>
                )}
              <button
                onClick={() => handleWithdraw("30")}
                disabled={!canWithdraw30 || txStatus.type !== "idle" || !walletReady}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {effectiveReleased30
                  ? "Already Released"
                  : canWithdraw30
                  ? `Withdraw ${
                      chainSnapshot
                        ? toAdaFromBig((BigInt(chainSnapshot.lockedLovelace) * 30n) / 100n)
                        : toAda(Math.floor(escrow.netTotal * 0.3))
                    } ADA`
                  : `Locked (${effectivePaidCount}/5)`}
              </button>
            </div>
          </div>

          {/* Engagement 40% milestone */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  40% Release
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  60% engagement metrics
                </p>
              </div>
              {effectiveReleased40 && (
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  Complete
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Watch Progress:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {engagement.avgWatchPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Avg Rating:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {engagement.avgRating.toFixed(1)}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Comments:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {engagement.totalComments}
                  </span>
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${milestone40Progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Engagement Score: {engagement.engagementScore}/100
              </p>
              {!effectiveReleased40 && (
                <button
                  onClick={handleEvaluate40}
                  disabled={!effectiveReleased30 || txStatus.type !== "idle"}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors mb-2"
                >
                  Evaluate Metrics
                </button>
              )}
              <button
                onClick={() => handleWithdraw("40")}
                disabled={!canWithdraw40 || txStatus.type !== "idle" || !walletReady}
                className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {effectiveReleased40
                  ? "Already Released"
                  : canWithdraw40
                  ? `Withdraw ${toAda(Math.floor(escrow.netTotal * 0.4))} ADA`
                  : "Requirements Not Met"}
              </button>
            </div>
          </div>

          {/* Final 30% milestone */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Final 30%
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  After 14 days, no dispute
                </p>
              </div>
              {effectiveReleasedFinal && (
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                  Released
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Time Remaining:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {effectiveReleasedFinal ? "Complete" : `${daysRemaining} days`}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{
                    width: `${
                      effectiveReleasedFinal
                        ? 100
                        : Math.min(((14 - daysRemaining) / 14) * 100, 100)
                    }%`,
                  }}
                ></div>
              </div>
              <button
                onClick={() => handleWithdraw("final")}
                disabled={!canWithdrawFinal || txStatus.type !== "idle" || !walletReady}
                className="w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {effectiveReleasedFinal
                  ? "Already Released"
                  : canWithdrawFinal
                  ? `Withdraw ${toAda(escrow.netTotal)} ADA`
                  : `Available in ${daysRemaining} days`}
              </button>
              {escrow.status === "DISPUTED" && (
                <div className="mt-3 grid md:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleResolve("release")}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-semibold hover:opacity-90"
                  >
                    Resolve: Release to Instructor
                  </button>
                  <button
                    onClick={() => handleResolve("refund")}
                    className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 font-semibold hover:opacity-90"
                  >
                    Resolve: Refund Students
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info panel explaining the milestone system */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            How Withdrawals Work
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                30% Initial Release
              </p>
              <p>
                Automatically unlocks after 5 students enroll. Click "Withdraw"
                to claim funds.
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                40% Engagement Release
              </p>
              <p>
                Unlocks when students watch 60%+, leave ratings, and comment.
                Evaluate first, then withdraw.
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Final 30% Release
              </p>
              <p>
                Available 14 days after the first watch event if no disputes are
                filed. Finalises payout.
              </p>
            </div>
          </div>
        </div>

        {/* Local simulator for educational purposes */}
        <EscrowSimulator />
      </div>
    </div>
  );
}
