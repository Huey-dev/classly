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

// Define the redeemer schema for your validator.  These must match the
// contract’s expected constructors exactly.  Typing against this schema
// prevents passing invalid redeemer strings.
const EscrowRedeemerSchema = Data.Enum([
  Data.Object({
    AddPayment: Data.Object({
      netAmount: Data.Integer(),
      watchMet: Data.Boolean(),
      ratingX10: Data.Integer(),
      commented: Data.Boolean(),
      firstWatchAt: Data.Integer(),
    }),
  }),
  Data.Literal("ReleaseInitial"),
  Data.Literal("ReleaseMetrics40"),
  Data.Literal("ReleaseFinal"),
  Data.Literal("Refund"),
  Data.Literal("DisputeHold"),
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
  const { lucid, walletAddress } = useLucid();

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
          totalDuration: Number(courseData.totalDuration ?? 0),
          enrollmentCount: courseData.enrollmentCount ?? 0,
          videoCount: courseData._count?.contents ?? 0,
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
        });

        // Derive engagement metrics.  You can compute averages on the fly
        // or call a dedicated endpoint that returns these values already
        // aggregated.  Here we compute watch and rating averages locally.
        const totalDuration = Number(courseData.totalDuration ?? 0);
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

  // Convert lovelace to ADA (with fixed decimals) for display
  const toAda = (lovelace: number) => (lovelace / 1_000_000).toFixed(2);

  // Compute the days left in the dispute window.  Once `released40` is true
  // and the window has passed, the final 30% becomes withdrawable.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const daysRemaining = escrow
    ? Math.max(0, Math.floor((escrow.disputeBy - nowSeconds) / 86400))
    : 0;

  // Progress calculations for milestone bars.  If the escrow state is not yet
  // loaded, default to 0.
  const milestone30Progress = escrow
    ? Math.min((escrow.paidCount / 5) * 100, 100)
    : 0;
  const milestone40Progress = engagement ? engagement.engagementScore : 0;

  // Eligibility flags for each withdrawal.  30%: at least 5 payments and not yet
  // released.  40%: initial 30% has been released, metrics met, and not yet
  // released.  Final: 40% released, window elapsed, final not yet released.
  const canWithdraw30 = escrow
    ? escrow.paidCount >= 5 && !escrow.released30
    : false;
  const canWithdraw40 =
    escrow && engagement
      ? escrow.released30 &&
        !escrow.released40 &&
        engagement.engagementScore >= 100
      : false;
  const canWithdrawFinal = escrow
    ? escrow.released40 &&
      !escrow.releasedFinal &&
      nowSeconds >= escrow.disputeBy
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
    if (!lucid || !walletAddress || !escrow?.scriptAddress) {
      setTxStatus({ type: "error", message: "Wallet not connected" });
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
      const escrowUtxo = scriptUtxos.find((u) => u.datum);
      if (!escrowUtxo) throw new Error("Escrow UTxO not found");
      // Choose redeemer according to the milestone.  The names MUST match
      // EscrowRedeemerSchema exactly.
      type RedeemerNames =
        | "ReleaseInitial"
        | "ReleaseMetrics40"
        | "ReleaseFinal";
      let redeemerName: RedeemerNames;
      if (releaseType === "30") {
        redeemerName = "ReleaseInitial";
      } else if (releaseType === "40") {
        redeemerName = "ReleaseMetrics40";
      } else {
        redeemerName = "ReleaseFinal";
      }
      const redeemer =
        releaseType === "30"
          ? Data.to("ReleaseInitial")
          : releaseType === "40"
          ? Data.to("ReleaseMetrics40")
          : Data.to("ReleaseFinal");
      // Calculate payout based on the current netTotal.  In a more
      // sophisticated design you could track separate buckets for each
      // tranche; here we simply use the current netTotal and a fixed
      // percentage.  Note that BigInt arithmetic is necessary for Lovelace.
      let payoutLovelace = 0n;
      if (releaseType === "30") {
        payoutLovelace = BigInt(Math.floor(escrow.netTotal * 0.3));
      } else if (releaseType === "40") {
        payoutLovelace = BigInt(Math.floor(escrow.netTotal * 0.4));
      } else {
        payoutLovelace = BigInt(escrow.netTotal);
      }
      // Determine how much remains at the script after withdrawing the payout.
      const scriptLovelace = BigInt(escrowUtxo.assets?.lovelace ?? 0n);
      const remainingLovelace = scriptLovelace - payoutLovelace;
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
          { kind: "inline", value: escrowUtxo.datum! },
          { lovelace: remainingLovelace }
        );
      }
      // Add validity range (optional) and build
      const now = Math.floor(Date.now() / 1000);
      const tx = await txBuilder
        .validFrom(now * 1000)
        .validTo((now + 300) * 1000)
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
      const newPaidOut = escrow.paidOut + Number(payoutLovelace);
      const newNetTotal = escrow.netTotal - Number(payoutLovelace);
      await fetch(`/api/escrow/${courseId}/sync`, {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {txStatus.type !== "idle" && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              txStatus.type === "error"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200"
                : txStatus.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
            }`}
          >
            {txStatus.message}
            {txStatus.txHash && (
              <span className="ml-2 font-mono text-xs break-all">({txStatus.txHash})</span>
            )}
          </div>
        )}
        {/* Navigation back to dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ← Back to Dashboard
        </button>

        {/* Course header with metadata */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-6">
            {course.coverImage && (
              <img
                src={course.coverImage}
                alt={course.title}
                className="w-32 h-32 rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {course.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
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
              <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
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
                {course.averageRating && (
                  <div>
                    ⭐{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {course.averageRating.toFixed(1)}
                    </span>
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
                    View on Cardanoscan →
                  </a>
                )}
              </div>
              {["success", "error"].includes(txStatus.type) && (
                <button
                  onClick={() => setTxStatus({ type: "idle", message: "" })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Balance overview */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Escrow Balance
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
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
                {toAda(escrow.netTotal)} ADA
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
            {escrow.released30 && (
              <div
                className="bg-emerald-500 flex items-center justify-center text-sm font-semibold text-white"
                style={{ width: "30%" }}
              >
                30% ✓
              </div>
            )}
            {escrow.released40 && (
              <div
                className="bg-blue-500 flex items-center justify-center text-sm font-semibold text-white"
                style={{ width: "40%" }}
              >
                40% ✓
              </div>
            )}
            {!escrow.releasedFinal && (
              <div className="bg-amber-500 flex items-center justify-center text-sm font-semibold text-white flex-1">
                {escrow.released30 && escrow.released40
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
              {escrow.released30 && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  ✓ Complete
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Current Enrollments:
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {escrow.paidCount} / 5
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${milestone30Progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {escrow.released30
                  ? "✓ Funds released to instructor"
                  : `${5 - escrow.paidCount} more enrollments needed`}
              </p>
              <button
                onClick={() => handleWithdraw("30")}
                disabled={!canWithdraw30 || txStatus.type !== "idle"}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {escrow.released30
                  ? "Already Released"
                  : canWithdraw30
                  ? `Withdraw ${toAda(Math.floor(escrow.netTotal * 0.3))} ADA`
                  : `Locked (${escrow.paidCount}/5)`}
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
              {escrow.released40 && (
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  ✓ Complete
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
                    {engagement.avgRating.toFixed(1)}/10 ★
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
              {!escrow.released40 && (
                <button
                  onClick={handleEvaluate40}
                  disabled={!escrow.released30 || txStatus.type !== "idle"}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors mb-2"
                >
                  Evaluate Metrics
                </button>
              )}
              <button
                onClick={() => handleWithdraw("40")}
                disabled={!canWithdraw40 || txStatus.type !== "idle"}
                className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {escrow.released40
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
              {escrow.releasedFinal && (
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
                  {escrow.releasedFinal ? "Complete" : `${daysRemaining} days`}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{
                    width: `${
                      escrow.releasedFinal
                        ? 100
                        : Math.min(((14 - daysRemaining) / 14) * 100, 100)
                    }%`,
                  }}
                ></div>
              </div>
              <button
                onClick={() => handleWithdraw("final")}
                disabled={!canWithdrawFinal || txStatus.type !== "idle"}
                className="w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {escrow.releasedFinal
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
