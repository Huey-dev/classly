'use client';

import { useEffect, useMemo, useState } from "react";

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

type ApiResult = { ok: boolean; data: any; error?: string };

async function callJson(url: string, options?: RequestInit): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, data, error: data?.error || res.statusText };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, data: null, error: e?.message || "Request failed" };
  }
}

export default function EscrowDevPage() {
  const [courseId, setCourseId] = useState("");
  const [grossAmount, setGrossAmount] = useState("1000000");
  const [watchMet, setWatchMet] = useState(true);
  const [ratingX10, setRatingX10] = useState("80");
  const [commented, setCommented] = useState(true);
  const [firstWatchAt, setFirstWatchAt] = useState(`${Date.now()}`);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentEscrow, setCurrentEscrow] = useState<EscrowRow | null>(null);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLogs((prev) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 50));

  const fetchEscrow = async () => {
    if (!courseId) return;
    setLoading(true);
    const res = await callJson(`/api/escrow/${courseId}`);
    if (res.ok) {
      setCurrentEscrow(res.data);
      addLog(`Fetched escrow ${res.data.id}`);
    } else {
      setCurrentEscrow(null);
      addLog(`Fetch failed: ${res.error}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) fetchEscrow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const datumSummary = useMemo(() => {
    if (!currentEscrow) return "No escrow loaded";
    return [
      `Status: ${currentEscrow.status ?? "N/A"}`,
      `Net Total: ${currentEscrow.netTotal ?? "0"}`,
      `Paid Out: ${currentEscrow.paidOut ?? "0"}`,
      `Paid Count: ${currentEscrow.paidCount ?? 0}`,
      `Released30: ${currentEscrow.released30 ? "yes" : "no"}`,
      `Released40: ${currentEscrow.released40 ? "yes" : "no"}`,
      `ReleasedFinal: ${currentEscrow.releasedFinal ? "yes" : "no"}`,
      `Comments: ${currentEscrow.comments ?? 0}`,
      `Rating Sum: ${currentEscrow.ratingSum ?? 0} / Count: ${currentEscrow.ratingCount ?? 0}`,
    ].join(" | ");
  }, [currentEscrow]);

  const handleCreate = async () => {
    if (!courseId) return addLog("courseId required");
    setLoading(true);
    const res = await callJson("/api/escrow/create", {
      method: "POST",
      body: JSON.stringify({
        courseId,
        receiverPkh: "deadbeef", // replace with test key hash
        oraclePkh: "cafebabe", // replace with oracle key hash
        initialAmount: Number(grossAmount),
        watchMet,
        ratingX10: Number(ratingX10),
        commented,
        firstWatchAt: Number(firstWatchAt),
      }),
    });
    addLog(res.ok ? "Created escrow" : `Create failed: ${res.error}`);
    await fetchEscrow();
    setLoading(false);
  };

  const handleAddPayment = async () => {
    if (!courseId) return addLog("courseId required");
    setLoading(true);
    const res = await callJson("/api/escrow/add-payment", {
      method: "POST",
      body: JSON.stringify({
        courseId,
        grossAmount: Number(grossAmount),
        watchMet,
        ratingX10: Number(ratingX10),
        commented,
        firstWatchAt: Number(firstWatchAt),
      }),
    });
    addLog(res.ok ? `Add payment: immediatePayout=${res.data?.immediatePayout}` : `Add payment failed: ${res.error}`);
    await fetchEscrow();
    setLoading(false);
  };

  const handleDispute = async () => {
    if (!courseId) return addLog("courseId required");
    setLoading(true);
    const res = await callJson(`/api/escrow/${courseId}/dispute`, {
      method: "POST",
      body: JSON.stringify({ reason: "Course not good" }),
    });
    addLog(res.ok ? "Dispute triggered" : `Dispute failed: ${res.error}`);
    await fetchEscrow();
    setLoading(false);
  };

  const handleResolve = async (action: "release" | "refund") => {
    if (!courseId) return addLog("courseId required");
    setLoading(true);
    const res = await callJson(`/api/escrow/${courseId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    addLog(res.ok ? `Resolved: ${res.data?.status}` : `Resolve failed: ${res.error}`);
    await fetchEscrow();
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Escrow Dev Console</h1>
          {loading && <span className="text-sm text-blue-600">Loading...</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Inputs</h2>
            <label className="text-sm font-semibold">Course ID</label>
            <input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="course-id"
            />
            <label className="text-sm font-semibold">Gross Amount (lovelace)</label>
            <input
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={watchMet} onChange={(e) => setWatchMet(e.target.checked)} />
                Watch Met
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={commented} onChange={(e) => setCommented(e.target.checked)} />
                Commented
              </label>
            </div>
            <label className="text-sm font-semibold">Rating x10</label>
            <input
              value={ratingX10}
              onChange={(e) => setRatingX10(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            <label className="text-sm font-semibold">First Watch At (timestamp)</label>
            <input
              value={firstWatchAt}
              onChange={(e) => setFirstWatchAt(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold">
                Create Escrow
              </button>
              <button onClick={handleAddPayment} className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold">
                Add Payment
              </button>
              <button onClick={handleDispute} className="rounded-lg bg-orange-500 px-4 py-2 text-white font-semibold">
                Trigger Dispute
              </button>
              <button onClick={() => handleResolve("release")} className="rounded-lg bg-purple-600 px-4 py-2 text-white font-semibold">
                Resolve Release
              </button>
              <button onClick={() => handleResolve("refund")} className="rounded-lg bg-red-600 px-4 py-2 text-white font-semibold">
                Resolve Refund
              </button>
              <button onClick={fetchEscrow} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Refresh Escrow
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">State</h2>
            <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
              {currentEscrow ? datumSummary : "No escrow loaded"}
            </div>
            <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm max-h-64 overflow-y-auto">
              <p className="font-semibold mb-2">Logs</p>
              {logs.length === 0 ? <p className="text-slate-500 text-sm">No events yet.</p> : logs.map((l, i) => <p key={i}>{l}</p>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
