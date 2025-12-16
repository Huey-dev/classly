"use client";

import { useState } from "react";
import { useLucid } from "../../context/LucidContext";

type Props = {
  courseId: string;
  enrolled: boolean;
  initialAverage?: number | null;
  initialCount?: number | null;
};

export default function RatingClaimClient({ courseId, enrolled, initialAverage, initialCount }: Props) {
  const { walletAddress } = useLucid();
  const [rating, setRating] = useState<number>(5);
  const [avg, setAvg] = useState<number | null>(initialAverage ?? null);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [ratingStatus, setRatingStatus] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  const [claimAddr, setClaimAddr] = useState<string>(walletAddress || "");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  if (!enrolled) return null;

  const submitRating = async () => {
    setRatingBusy(true);
    setRatingStatus(null);
    setRatingError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit rating");
      setAvg(json.averageRating ?? null);
      setCount(json.ratingCount ?? 0);
      setRatingStatus("Rating saved");
    } catch (e: any) {
      setRatingError(e?.message || "Rating failed");
    } finally {
      setRatingBusy(false);
    }
  };

  const submitClaim = async () => {
    setClaimBusy(true);
    setClaimStatus(null);
    setClaimError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/nft-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientAddress: claimAddr }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to start claim");
      setClaimStatus(`Claim created: status ${json.claim?.status || "LOCKED"}`);
    } catch (e: any) {
      setClaimError(e?.message || "Claim failed");
    } finally {
      setClaimBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Your feedback</p>
          <p className="text-xs text-slate-500">Rate this course (1-5)</p>
        </div>
        <div className="text-xs text-slate-600">
          Avg: {avg ?? "N/A"} ({count} ratings)
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(Math.max(1, Math.min(5, Number(e.target.value))))}
          className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={submitRating}
          disabled={ratingBusy}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {ratingBusy ? "Saving…" : "Submit rating"}
        </button>
      </div>
      {ratingStatus && <p className="text-xs text-emerald-700">{ratingStatus}</p>}
      {ratingError && <p className="text-xs text-red-700">{ratingError}</p>}

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Claim certificate NFT</p>
        <p className="text-xs text-slate-500">Send to this address (defaults to your wallet)</p>
        <input
          type="text"
          value={claimAddr}
          onChange={(e) => setClaimAddr(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="addr_test..."
        />
        <button
          onClick={submitClaim}
          disabled={claimBusy || !claimAddr}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {claimBusy ? "Submitting…" : "Claim NFT"}
        </button>
        {claimStatus && <p className="text-xs text-emerald-700">{claimStatus}</p>}
        {claimError && <p className="text-xs text-red-700">{claimError}</p>}
      </div>
    </div>
  );
}
