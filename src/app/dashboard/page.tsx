
'use client';

import { useEffect, useState } from 'react';
import WalletOverview from './component/WalletOverview';
import PaginatedCourseGrid from './component/PaginatedCourseGrid';

/**
 * DashboardPage displays the user's wallet overview and lists their courses.
 *
 * - The API GET /api/me/dashboard returns two arrays: `created` and `enrolled`.
 * - Each created course includes the latest escrow snapshot (script address, paidCount, paidOut, etc.).
 * - Each enrolled course includes basic info about the course and its author.
 * - A loading/error state is shown while data is fetched.
 */
export default function DashboardPage() {
  const [data, setData] = useState({ created: [], enrolled: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch('/api/me/dashboard');
        if (!res.ok) throw new Error(`Dashboard load failed: ${res.status}`);
        const json = await res.json();
        if (!alive) return;
        setData({
          created: json.created ?? [],
          enrolled: json.enrolled ?? [],
        });
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Failed to load dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Wallet overview with copy/connect controls */}
      <WalletOverview />

      {/* Error message */}
      {err && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      {/* Loading indicator */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading your courses…</p>
        </div>
      ) : (
        <>
          {/* Enrolled courses – only show if there are any */}
          <PaginatedCourseGrid title="Enrolled Courses" courses={data.enrolled} mode="student" />

          {/* Created courses – only show if there are any */}
          <PaginatedCourseGrid title="My Created Courses" courses={data.created} mode="creator" />
        </>
      )}
    </div>
  );
}
