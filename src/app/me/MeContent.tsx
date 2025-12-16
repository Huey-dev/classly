"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CourseManager from "./CourseManager";
import WalletOverview from "../dashboard/component/WalletOverview";
import PaginatedCourseGrid from "../dashboard/component/PaginatedCourseGrid";
import { useLucid } from "../context/LucidContext";

type Dashboard = {
  followers: number;
  following: number;
  videosCount: number;
  earningsMonth: number;
  totalViews: number;
  subscribers: number;
  coursesCreated: number;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  enrollmentCount: number;
  likes: number;
  rating?: number | null;
  videoCount: number;
  durationWeeks: number;
  coverImage?: string | null;
  author: { id: string; name: string | null; image: string | null };
};

type DashboardCourses = { created: any[]; enrolled: any[] };
type NftItem = { unit: string; policyId: string; assetName: string; quantity: string };

const FAUCET_URL = "https://docs.cardano.org/cardano-testnet/tools/faucet/";
const BLOCKFROST_NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "preview").toLowerCase();
const BLOCKFROST_BASE =
  BLOCKFROST_NETWORK.includes("preprod")
    ? "https://cardano-preprod.blockfrost.io/api/v0"
    : BLOCKFROST_NETWORK.includes("mainnet")
    ? "https://cardano-mainnet.blockfrost.io/api/v0"
    : "https://cardano-preview.blockfrost.io/api/v0";

export default function MeContent({ dashboard, courses }: { dashboard: Dashboard; courses: Course[] }) {
  const [tab, setTab] = useState<"dashboard" | "wall" | "courses" | "nfts">("dashboard");
  const [dashData, setDashData] = useState<DashboardCourses>({ created: [], enrolled: [] });
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);

  const { walletAddress } = useLucid();
  const bfKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setDashLoading(true);
        setDashError(null);
        const res = await fetch("/api/me/dashboard");
        if (!res.ok) throw new Error(`Dashboard load failed (${res.status})`);
        const json = await res.json();
        if (!alive) return;
        setDashData({ created: json.created ?? [], enrolled: json.enrolled ?? [] });
      } catch (e: any) {
        if (!alive) return;
        setDashError(e?.message ?? "Failed to load dashboard");
      } finally {
        if (alive) setDashLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchNfts = async () => {
      if (!walletAddress) {
        setNfts([]);
        setNftError("Connect your wallet to view NFTs.");
        return;
      }
      if (!bfKey) {
        setNftError("Missing Blockfrost API key.");
        return;
      }
      setNftLoading(true);
      setNftError(null);
      try {
        const res = await fetch(`${BLOCKFROST_BASE}/addresses/${walletAddress}/utxos`, {
          headers: { project_id: bfKey },
        });
        if (res.status === 404) {
          setNfts([]);
          setNftError("Wallet has no on-chain activity yet. Fund from faucet and try again.");
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load NFTs (${res.status})`);
        }
        const utxos = await res.json();
        const totals = new Map<string, bigint>();
        for (const utxo of utxos) {
          for (const amt of utxo.amount || []) {
            if (!amt || amt.unit === "lovelace") continue;
            const prev = totals.get(amt.unit) ?? BigInt(0);
            totals.set(amt.unit, prev + BigInt(amt.quantity));
          }
        }
        const parsed: NftItem[] = Array.from(totals.entries()).map(([unit, qty]) => {
          const policyId = unit.slice(0, 56);
          const assetHex = unit.slice(56);
          return {
            unit,
            policyId,
            assetName: hexToAscii(assetHex) || assetHex || "NFT",
            quantity: qty.toString(),
          };
        });
        if (!alive) return;
        setNfts(parsed);
      } catch (e: any) {
        if (!alive) return;
        setNftError(e?.message ?? "Failed to load NFTs");
      } finally {
        if (alive) setNftLoading(false);
      }
    };
    fetchNfts();
    return () => {
      alive = false;
    };
  }, [walletAddress, bfKey]);

  const tabs = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard" },
      { key: "wall", label: "Stats" },
      { key: "courses", label: "Courses" },
      { key: "nfts", label: "NFTs" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`pb-2 border-b-2 ${
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          <WalletOverview />
          <FaucetHelper walletAddress={walletAddress} />
          {dashError && (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
              {dashError}
            </div>
          )}
          {dashLoading ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
              Loading dashboard...
            </div>
          ) : (
            <>
              <PaginatedCourseGrid title="Enrolled Courses" courses={dashData.enrolled} mode="student" />
              <PaginatedCourseGrid title="My Created Courses" courses={dashData.created} mode="creator" />
            </>
          )}
        </div>
      )}

      {tab === "wall" && <DashboardSummary dashboard={dashboard} />}

      {tab === "courses" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Courses</h3>
          {courses.length === 0 ? (
            <CourseManager />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/course/${course.id}`}
                    className="p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition"
                  >
                    <div className="h-36 bg-gray-200 dark:bg-gray-700">
                      {course.coverImage ? (
                        <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500" />
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-base font-semibold">{course.title}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {course.description || "No description yet."}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{course.durationWeeks} wk</span>
                        <span aria-hidden="true">|</span>
                        <span>{course.videoCount} videos</span>
                        <span aria-hidden="true">|</span>
                        <span>Rating {course.rating ?? "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>Likes {course.likes}</span>
                        <span aria-hidden="true">|</span>
                        <span>{course.enrollmentCount} enrolled</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {course.author.image ? (
                          <img
                            src={course.author.image}
                            alt={course.author.name || "Author"}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold">
                            {course.author.name?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-200">
                          {course.author.name || "Author"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <CourseManager />
            </>
          )}
        </div>
      )}

      {tab === "nfts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">NFTs</h3>
            <FaucetHelper walletAddress={walletAddress} compact />
          </div>
          {nftError && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-800 dark:text-amber-200">
              {nftError}
            </div>
          )}
          {nftLoading ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">Loading NFTs...</div>
          ) : !walletAddress ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">Connect your wallet to view minted NFTs.</div>
          ) : nfts.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              No NFTs detected in this wallet yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nfts.map((nft) => (
                <div
                  key={nft.unit}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-1 shadow-sm"
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{nft.assetName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 break-all">
                    Policy: {nft.policyId}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 break-all">Unit: {nft.unit}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">Quantity: {nft.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardSummary({ dashboard }: { dashboard: Dashboard }) {
  const tiles = [
    { label: "Earning (Month)", value: `$${dashboard.earningsMonth.toLocaleString()}` },
    { label: "Total Views", value: dashboard.totalViews.toLocaleString() },
    { label: "Subscribers", value: dashboard.subscribers.toLocaleString() },
    { label: "Courses Created", value: dashboard.coursesCreated },
    { label: "Followers", value: dashboard.followers },
    { label: "Videos", value: dashboard.videosCount },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">My Wall</h3>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-200">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400">{tile.label}</div>
              <div className="text-lg font-semibold">{tile.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaucetHelper({ walletAddress, compact = false }: { walletAddress: string | null; compact?: boolean }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "missing">("idle");

  const copy = async () => {
    if (!walletAddress || typeof navigator === "undefined") {
      setCopied("missing");
      setTimeout(() => setCopied("idle"), 1200);
      return;
    }
    await navigator.clipboard.writeText(walletAddress);
    setCopied("copied");
    setTimeout(() => setCopied("idle"), 1200);
  };

  return (
    <div
      className={`rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Need test ADA? Copy your address and open the faucet.
          </p>
          <p className="text-xs text-blue-700/80 dark:text-blue-200/80 break-all">
            {walletAddress || "Connect wallet to generate an address."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-800 text-sm font-semibold bg-white/80 dark:bg-blue-950 hover:bg-white"
          >
            {copied === "copied" ? "Copied" : "Copy address"}
          </button>
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Open faucet
          </a>
        </div>
      </div>
    </div>
  );
}

function hexToAscii(hex: string) {
  try {
    if (!hex) return "";
    const bytes = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
    return String.fromCharCode(...bytes);
  } catch {
    return "";
  }
}
