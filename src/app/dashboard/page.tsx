
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
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch('/api/me/dashboard');
        if (res.status === 401) {
          setUnauthorized(true);
          setData({ created: [], enrolled: [] });
          throw new Error(`Dashboard load failed: ${res.status}`);
        }
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
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-100">
        <p className="font-semibold mb-2">How to get test ADA (preprod/preview)</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Copy your wallet address from the card above.</li>
          <li>
            Open the official faucet and select <strong>preprod</strong> (or preview if your token is preview):{" "}
            <a href="https://docs.cardano.org/cardano-testnet/tools/faucet/" target="_blank" rel="noreferrer" className="underline">
              Cardano testnet faucet
            </a>
            .
          </li>
          <li>Paste your address, complete the captcha, and request funds.</li>
          <li>Wait ~30-60 seconds, then click Refresh to see your balance.</li>
        </ol>
      </div>

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
      ) : unauthorized ? (
        <EmptyState
          title="Please sign in to view your dashboard."
          primary={{ href: "/signin", label: "Sign in" }}
          secondary={{ href: "/", label: "Explore courses" }}
        />
      ) : (
        <>
          {data.enrolled.length === 0 ? (
            <EmptyState
              title="No course enrollments yet."
              primary={{ href: "/", label: "Browse courses" }}
              secondary={{ href: "/upload", label: "Create a course" }}
            />
          ) : (
            <PaginatedCourseGrid title="Enrolled Courses" courses={data.enrolled} mode="student" />
          )}

          {data.created.length === 0 ? (
            <EmptyState
              title="No courses created yet."
              primary={{ href: "/upload", label: "Create a course" }}
              secondary={{ href: "/", label: "View marketplace" }}
            />
          ) : (
            <PaginatedCourseGrid title="My Created Courses" courses={data.created} mode="creator" />
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col gap-3 shadow-sm">
      <p className="text-sm text-gray-700 dark:text-gray-200">{title}</p>
      <div className="flex items-center gap-2">
        <a
          href={primary.href}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          {primary.label}
        </a>
        {secondary && (
          <a
            href={secondary.href}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {secondary.label}
          </a>
        )}
      </div>
    </div>
  );
}
