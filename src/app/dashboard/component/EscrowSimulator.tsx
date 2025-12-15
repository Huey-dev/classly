'use client';

import { useState } from 'react';

/**
 * EscrowSimulator is a standalone demo component that mimics the escrow release logic
 * on the client.  It operates entirely in local state.  Students can be "registered"
 * by clicking Add Payment, a Release 30% button becomes active after 5 payments,
 * engagement and rating can be simulated by Increase Engagement, and the 40% and final
 * releases become available when their conditions are met.
 */
export default function EscrowSimulator() {
  /**
   * Internal simulation state:
   * - netTotal: total funds locked in escrow (after any prior releases)
   * - paidOut: total funds released to the creator
   * - paidCount: number of simulated student payments
   * - released30, released40, releasedFinal: whether each tranche has been released
   * - progressWatch: simulated average watch percentage (0–100)
   * - progressRating: simulated rating percentage (0–100); 60% corresponds to an
   *   average rating of 6/10 (the 40% tranche requires both watch ≥ 60 and rating ≥ 60)
   * - daysRemaining: days left in the 14‑day dispute window for final release
   */
  const [sim, setSim] = useState({
    netTotal: 0,
    paidOut: 0,
    paidCount: 0,
    released30: false,
    released40: false,
    releasedFinal: false,
    progressWatch: 0,
    progressRating: 0,
    daysRemaining: 14,
  });

  /** Utility: convert units to ADA for display.  In this simulator we treat
   * 100 units as 1 ADA to keep numbers small.
   */
  const toAda = (value: number) => (value / 100).toFixed(2);

  // Simulate a student payment.  Each payment adds 100 units to escrow.
  // Before the initial 30% release, payments simply accumulate netTotal.
  // After the initial 30% has been released, each payment immediately pays
  // its 30% tranche to the creator (sim.netTotal += netAmount - payout).
  const handleAddPayment = () => {
    const netAmount = 100; // assume each student pays 100 units (1 ADA)
    setSim((prev) => {
      let newNet = prev.netTotal;
      let newPaidOut = prev.paidOut;
      // If the 30% milestone has already been released, pay the tranche immediately
      if (prev.released30) {
        const payout = netAmount * 0.3;
        newNet += netAmount - payout;
        newPaidOut += payout;
      } else {
        newNet += netAmount;
      }
      return {
        ...prev,
        netTotal: newNet,
        paidOut: newPaidOut,
        paidCount: prev.paidCount + 1,
      };
    });
  };

  // Release the initial 30% after 5 students have paid.  This releases 30% of
  // the current netTotal to the creator and sets released30 = true.  Subsequent
  // payments will automatically pay their own 30% tranche.
  const handleRelease30 = () => {
    setSim((prev) => {
      if (prev.released30 || prev.paidCount < 5) return prev;
      const payout = prev.netTotal * 0.3;
      return {
        ...prev,
        netTotal: prev.netTotal - payout,
        paidOut: prev.paidOut + payout,
        released30: true,
      };
    });
  };

  // Increase engagement: each click raises both watch and rating by 20% (up to 100).
  // Metrics for the 40% tranche require both progressWatch and progressRating to
  // reach at least 60% (simulating 60% watch completion and a rating ≥ 6/10).
  const handleIncreaseEngagement = () => {
    setSim((prev) => {
      if (prev.releasedFinal) return prev;
      return {
        ...prev,
        progressWatch: Math.min(prev.progressWatch + 20, 100),
        progressRating: Math.min(prev.progressRating + 20, 100),
      };
    });
  };

  // Release the 40% tranche once engagement metrics are met and the initial 30%
  // has been released.  This pays 40% of the current netTotal to the creator.
  const handleRelease40 = () => {
    setSim((prev) => {
      if (!prev.released30 || prev.released40) return prev;
      // Engagement criteria: watch ≥ 60% and rating ≥ 60%
      const metricsMet = prev.progressWatch >= 60 && prev.progressRating >= 60;
      if (!metricsMet) return prev;
      const payout = prev.netTotal * 0.4;
      return {
        ...prev,
        netTotal: prev.netTotal - payout,
        paidOut: prev.paidOut + payout,
        released40: true,
      };
    });
  };

  // Fast‑forward the dispute window.  Sets daysRemaining to 0.  The final 30% can
  // only be released when released40 is true and daysRemaining has reached zero.
  const handleFastForward = () => {
    setSim((prev) => ({ ...prev, daysRemaining: 0 }));
  };

  // Release the final 30% once the 14‑day window has passed, the 40% tranche has
  // been released, and the final tranche has not yet been released.
  const handleReleaseFinal = () => {
    setSim((prev) => {
      if (!prev.released40 || prev.releasedFinal || prev.daysRemaining > 0) return prev;
      return {
        ...prev,
        paidOut: prev.paidOut + prev.netTotal,
        netTotal: 0,
        releasedFinal: true,
      };
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Local Escrow Simulator</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Use this simulator to understand how Classly's escrow milestones work.  Each simulated student
        payment adds funds to escrow.  After 5 payments you can release the initial 30% of the pool.
        Increase engagement until both watch and rating reach 60% to unlock the 40% tranche.  Finally,
        fast‑forward past the dispute window to release the remaining 30%.
      </p>

      {/* Display simulated state */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400">Locked (net)</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{toAda(sim.netTotal)} ADA</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400">Released</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{toAda(sim.paidOut)} ADA</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400">Students</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{sim.paidCount}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400">Days Remaining</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {sim.releasedFinal ? '—' : sim.daysRemaining}
          </p>
        </div>
      </div>

      {/* Engagement progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Average Watch</span>
          <span className="font-semibold text-gray-900 dark:text-white">{sim.progressWatch}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${sim.progressWatch}%` }}></div>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600 dark:text-gray-400">Average Rating</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {(sim.progressRating / 10).toFixed(1)} / 10
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${sim.progressRating}%` }}></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2 md:space-y-0 md:flex md:gap-3 mt-4">
        <button
          onClick={handleAddPayment}
          disabled={sim.releasedFinal}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          + Add Payment
        </button>

        <button
          onClick={handleRelease30}
          disabled={sim.released30 || sim.paidCount < 5 || sim.releasedFinal}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          Release 30%
        </button>

        <button
          onClick={handleIncreaseEngagement}
          disabled={sim.releasedFinal}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          Increase Engagement
        </button>

        <button
          onClick={handleRelease40}
          disabled={!sim.released30 || sim.released40 || sim.progressWatch < 60 || sim.progressRating < 60 || sim.releasedFinal}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          Release 40%
        </button>

        <button
          onClick={handleFastForward}
          disabled={sim.daysRemaining <= 0 || sim.releasedFinal}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          ⏩ Fast‑forward 14 days
        </button>

        <button
          onClick={handleReleaseFinal}
          disabled={!sim.released40 || sim.releasedFinal || sim.daysRemaining > 0}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          Release Final 30%
        </button>
      </div>
    </div>
  );
}
