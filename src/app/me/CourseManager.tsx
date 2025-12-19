"use client";

import { useEffect, useState } from "react";
import { Data } from "@lucid-evolution/lucid";
import {
  EscrowDatumSchema,
  getEscrowAddress,
  resolveNetwork,
} from "../lib/contracts";
import { hashCourseId, normalizePkh } from "../lib/escrow-utils";
import { useLucid } from "../context/LucidContext";

type Course = {
  id: string;
  title: string;
  description?: string | null;
  enrollmentCount?: number;
  contentCount?: number;
  coverImage?: string | null;
  priceAda?: number | null;
  isPaid?: boolean;
  visibility?: string;
};

type Video = {
  id: string;
  title: string;
  courseId?: string | null;
  partNumber?: number | null;
  status: string;
};

export default function CourseManager() {
  const { walletAddress, lucid } = useLucid();
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [initializingEscrow, setInitializingEscrow] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [cRes, vRes] = await Promise.all([fetch("/api/courses"), fetch("/api/me/videos")]);
      if (cRes.ok) {
        setCourses(await cRes.json());
      }
      if (vRes.ok) {
        setVideos(await vRes.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeEscrow = async (courseId: string) => {
    if (!lucid || !walletAddress) {
      throw new Error("Connect your payout wallet to initialize escrow.");
    }
    const oraclePkhEnv = process.env.NEXT_PUBLIC_ORACLE_PKH;
    if (!oraclePkhEnv) {
      throw new Error("Oracle PKH is not configured (NEXT_PUBLIC_ORACLE_PKH).");
    }

    setInitializingEscrow(true);
    try {
      const courseIdHash = hashCourseId(courseId);
      const receiverPkh = normalizePkh(walletAddress, "Payout wallet");
      const oraclePkh = normalizePkh(oraclePkhEnv, "Oracle PKH");
      const scriptAddress = await getEscrowAddress(lucid, resolveNetwork());
      const minAda = 2_000_000n; // keep the script alive with a minimal UTxO
      const datum = {
        courseId: courseIdHash,
        receiver: receiverPkh,
        oracle: oraclePkh,
        netTotal: 0n,
        paidCount: 0n,
        paidOut: 0n,
        released30: false,
        released40: false,
        releasedFinal: false,
        comments: 0n,
        ratingSum: 0n,
        ratingCount: 0n,
        allWatchMet: true,
        firstWatch: 0n,
        disputeBy: BigInt(Date.now()) + 14n * 24n * 60n * 60n * 1000n,
      };

      const tx = await lucid
        .newTx()
        .pay.ToContract(
          scriptAddress,
          { kind: "inline", value: Data.to(datum as any, EscrowDatumSchema) },
          { lovelace: minAda }
        )
        .complete();

      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();

      await fetch("/api/escrow/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          courseIdHash,
          receiverPkh,
          oraclePkh,
          scriptAddress,
          netTotal: 0,
          paidCount: 0,
          paidOut: 0,
          released30: false,
          released40: false,
          releasedFinal: false,
          status: "PENDING",
        }),
      });

      setMessage((prev) =>
        [prev, `Escrow initialized. Tx: ${hash.slice(0, 10)}...`]
          .filter(Boolean)
          .join(" ")
      );
    } finally {
      setInitializingEscrow(false);
    }
  };

  const createCourse = async () => {
    if (!newTitle.trim()) {
      setMessage("Course title is required");
      return;
    }
    if (newPrice && (!lucid || !walletAddress)) {
      setMessage("Connect your payout wallet before creating a paid course so escrow can be initialized.");
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          coverImage: newCover,
          priceAda: newPrice ? Number(newPrice) : undefined,
          walletAddress: walletAddress || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create course");
      }
      const course = await res.json();

      if (course.isPaid) {
        try {
          await initializeEscrow(course.id);
        } catch (escrowErr: any) {
          setMessage(escrowErr?.message || "Course created, but escrow initialization failed. Open the course page and initialize escrow.");
        }
      }

      setCourses((prev) => [course, ...prev]);
      setSelectedCourse(course.id);
      setNewTitle("");
      setNewDescription("");
      setNewCover("");
      setNewPrice("");
      setMessage("Course created");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const attachVideo = async (videoId: string) => {
    if (!selectedCourse) {
      setMessage("Choose a course first");
      return;
    }
    setMessage(null);
    try {
      const res = await fetch(`/api/courses/${selectedCourse}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: videoId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to attach video");
      }
      const updated = await res.json();
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, courseId: updated.courseId } : v))
      );
      setMessage("Video added to course");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to attach video");
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Courses</h3>
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Select a course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <option value="">Choose course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.visibility ? `(${c.visibility})` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Pick a course, then attach any of your uploaded videos below.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Create course
          </label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Course title"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            disabled={creating}
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Short description"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
            disabled={creating}
          />
          <input
            value={newCover}
            onChange={(e) => setNewCover(e.target.value)}
            placeholder="Cover image URL (optional)"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            disabled={creating}
          />
          <input
            type="number"
            min={0}
            step="0.01"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="Price in ADA (leave blank for free)"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          disabled={creating}
        />
        <button
          onClick={createCourse}
          disabled={creating || initializingEscrow}
          className={`w-full px-3 py-2 rounded-lg font-semibold ${
            creating || initializingEscrow
              ? "bg-gray-200 text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {creating || initializingEscrow ? "Creating..." : "Create course"}
        </button>
          <p className="text-[11px] text-gray-500">
            Courses publish automatically on creation and use your connected wallet for payouts.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Your videos</h4>
        {videos.length === 0 ? (
          <div className="text-sm text-gray-500">No uploads yet.</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{video.title}</div>
                  <div className="text-xs text-gray-500">
                    {video.status} {video.courseId ? `• in course` : ""}
                  </div>
                </div>
                <button
                  onClick={() => attachVideo(video.id)}
                  className="px-3 py-1 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700"
                >
                  Add to course
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {message && <div className="text-sm text-blue-600 dark:text-blue-300">{message}</div>}
    </div>
  );
}
