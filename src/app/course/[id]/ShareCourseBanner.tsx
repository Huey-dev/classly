'use client';

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";

type ShareStats = {
  totalClicks: number;
  totalEnrollments: number;
  conversionRate: number;
};

type Props = {
  courseId: string;
  instructorId: string;
  initialStats?: ShareStats | null;
};

const FALLBACK_STATS: ShareStats = { totalClicks: 0, totalEnrollments: 0, conversionRate: 0 };

function buildShareUrl(base: string | null, courseId: string, instructorId: string) {
  const safeBase = (base || "https://classly.com").replace(/\/$/, "");
  try {
    const url = new URL(`/course/${courseId}`, safeBase);
    url.searchParams.set("ref", instructorId);
    return url.toString();
  } catch (_e) {
    return `${safeBase}/course/${encodeURIComponent(courseId)}?ref=${encodeURIComponent(instructorId)}`;
  }
}

export function ShareCourseBanner({ courseId, instructorId, initialStats }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [stats, setStats] = useState<ShareStats>(initialStats ?? FALLBACK_STATS);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState(() =>
    buildShareUrl(process.env.NEXT_PUBLIC_APP_URL || null, courseId, instructorId)
  );

  const socialMessage = useMemo(
    () => `Join my course on Classly and start learning today: ${shareUrl}`,
    [shareUrl]
  );

  useEffect(() => {
    const base =
      (typeof window !== "undefined" && window.location?.origin) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://classly.com";
    setShareUrl(buildShareUrl(base, courseId, instructorId));
  }, [courseId, instructorId]);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/share-stats`, { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unable to load stats");
        }
        const data = await res.json();
        if (!active) return;
        setStats({
          totalClicks: data.totalClicks ?? 0,
          totalEnrollments: data.totalEnrollments ?? 0,
          conversionRate: data.conversionRate ?? 0,
        });
        setStatsError(null);
      } catch (e) {
        if (!active) return;
        setStatsError((e as Error)?.message || "Unable to refresh stats");
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [courseId, instructorId]);

  useEffect(() => {
    if (!qrOpen || !shareUrl) return;
    setQrLoading(true);
    QRCode.toDataURL(shareUrl, { margin: 1, width: 360 })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
      .finally(() => setQrLoading(false));
  }, [qrOpen, shareUrl]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  }, [shareUrl]);

  const openShare = (platform: "whatsapp" | "twitter" | "linkedin" | "email") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedMsg = encodeURIComponent(socialMessage);
    let href = shareUrl;
    switch (platform) {
      case "whatsapp":
        href = `https://api.whatsapp.com/send?text=${encodedMsg}`;
        break;
      case "twitter":
        href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(
          "Check out my course on Classly"
        )}`;
        break;
      case "linkedin":
        href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "email":
        href = `mailto:?subject=${encodeURIComponent(
          "Join my course on Classly"
        )}&body=${encodedMsg}`;
        break;
      default:
        break;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-slate-50 via-white to-blue-50 shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Shareable Instructor Link
              </p>
              <p className="text-sm text-slate-600">
                Copy, share or download a QR to attribute new students to you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SharePill label="WhatsApp" onClick={() => openShare("whatsapp")} />
              <SharePill label="Twitter" onClick={() => openShare("twitter")} />
              <SharePill label="LinkedIn" onClick={() => openShare("linkedin")} />
              <SharePill label="Email" onClick={() => openShare("email")} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Course Link</div>
              <input
                readOnly
                value={shareUrl}
                className="w-full bg-transparent font-mono text-sm text-slate-800 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                <IconCopy />
                {copied ? "Copied! ✓" : "Copy Link"}
              </button>
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300"
              >
                <IconQr />
                QR Code
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Link Performance</p>
              <p className="text-xs text-slate-500">
                Tracks every click and enrollment coming from your share link.
              </p>
              {statsError && <p className="text-xs text-red-600 mt-1">{statsError}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <StatTile label="Total Clicks" value={stats.totalClicks.toLocaleString()} />
              <StatTile label="Total Enrollments" value={stats.totalEnrollments.toLocaleString()} />
              <StatTile label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} />
            </div>
          </div>
        </div>
      </div>

      {qrOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">QR Code for Course Link</p>
                <p className="text-sm text-slate-500">Scan or download to share offline</p>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 w-full flex items-center justify-center min-h-[220px]">
                {qrLoading && <p className="text-sm text-slate-500">Generating QR...</p>}
                {!qrLoading && qrDataUrl && (
                  <img src={qrDataUrl} alt="Course QR" className="w-full max-w-[240px] h-auto" />
                )}
                {!qrLoading && !qrDataUrl && (
                  <p className="text-sm text-red-500">Unable to generate QR code</p>
                )}
              </div>
              <div className="flex w-full gap-2">
                <a
                  href={qrDataUrl || "#"}
                  download={`course-${courseId}-qr.png`}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                    qrDataUrl
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                  aria-disabled={!qrDataUrl}
                >
                  <IconDownload />
                  Download PNG
                </a>
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SharePill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-300"
    >
      <IconShare />
      {label}
    </button>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconQr = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
  </svg>
);

const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51 8.59 10.5" />
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);
