"use client";

import { useState } from "react";
import Link from "next/link";

type Video = {
  id: string;
  title: string;
  muxPlaybackId: string | null;
  duration: number | null;
  partNumber: number | null;
  createdAt: string;
  description?: string | null;
};

type Props = {
  courseId: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  priceAda: number | null;
  isPaid?: boolean;
  averageRating?: number | null;
  updatedAt?: string | null;
  totalDurationSeconds?: number;
  author: { id: string; name: string | null; image: string | null };
  videos: Video[];
  enrolled: boolean;
  enrollmentCount: number;
  isOwner?: boolean;
  isTeacher?: boolean;
};

export default function CourseClient({
  courseId,
  title,
  description,
  coverImage,
  priceAda,
  isPaid,
  averageRating,
  updatedAt,
  totalDurationSeconds,
  author,
  videos,
  enrolled,
  enrollmentCount,
  isOwner = false,
  isTeacher = false,
}: Props) {
  const [isEnrolled, setIsEnrolled] = useState(enrolled);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(enrollmentCount);
  const [courseVideos, setCourseVideos] = useState<Video[]>(videos);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || "");
  const [editCover, setEditCover] = useState(coverImage || "");
  const [editPrice, setEditPrice] = useState(priceAda ?? 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEnroll = async () => {
    if (isEnrolled || isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to enroll");
      }
      setIsEnrolled(true);
      setCount((c) => c + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enroll");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSaveCourse = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          coverImage: editCover,
          priceAda: isTeacher ? editPrice : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save course");
      }
      setEditMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete course");
      }
      window.location.href = "/me";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/content/${videoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove video");
      }
      setCourseVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove video");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">Course</div>
              {editMode ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Course title"
                  />
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Course description"
                  />
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    value={editCover}
                    onChange={(e) => setEditCover(e.target.value)}
                    placeholder="Cover image URL"
                  />
                  {isTeacher && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-300">Price (ADA)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{title}</h1>
                  <p className="text-gray-600 dark:text-gray-300">{description || "No description yet."}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {priceAda !== null && priceAda > 0 ? (
                      <>
                        <span className="font-semibold text-green-600 dark:text-green-400">{priceAda} ADA</span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>Paid</span>
                      </>
                    ) : (
                      <span>Free</span>
                    )}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{count} learners</span>
                <span className="text-gray-400" aria-hidden="true">|</span>
                <span>{courseVideos.length} videos</span>
              </div>
              <Link href={`/profile/${author.id}`} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                {author.image ? (
                  <img src={author.image} alt={author.name || "Author"} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-semibold">
                    {author.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span>{author.name || "Author"}</span>
              </Link>
            </div>

            <div className="flex flex-col items-stretch gap-2 w-full md:w-auto">
              {isOwner ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditMode((p) => !p)}
                    className="px-4 py-2 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-sm"
                  >
                    {editMode ? "Cancel" : "Edit"}
                  </button>
                  {editMode && (
                    <button
                      onClick={handleSaveCourse}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white text-sm disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteCourse}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg font-semibold bg-red-500 text-white text-sm disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolled || isJoining}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    isEnrolled
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200 cursor-default"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isEnrolled ? "Enrolled" : isJoining ? "Enrolling..." : "Enroll to watch"}
                </button>
              )}
              {error && <div className="text-sm text-red-500">{error}</div>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Videos</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">{courseVideos.length} lessons</div>
          </div>
          {courseVideos.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No videos in this course yet.</div>
          ) : (
            <div className="space-y-3">
              {courseVideos.map((video) => (
                <CourseVideo key={video.id} video={video} locked={!isEnrolled} canManage={isOwner} onRemove={handleRemoveVideo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseVideo({ video, locked, canManage, onRemove }: { video: Video; locked: boolean; canManage?: boolean; onRemove?: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition bg-white dark:bg-gray-900/40">
      <div className="w-32 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
        {video.muxPlaybackId ? (
          <img
            src={`https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?time=1`}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        {locked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
            Locked
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
          {video.partNumber ? <span>Part {video.partNumber}</span> : <span>Video</span>}
          <span className="text-gray-400" aria-hidden="true">|</span>
          <span>{formatDuration(video.duration)}</span>
        </div>
        <Link
          href={`/video/${video.id}`}
          className={`text-base font-semibold line-clamp-2 ${locked ? "text-gray-400 dark:text-gray-500" : "text-blue-600 dark:text-blue-300"}`}
        >
          {video.title}
        </Link>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Added {new Date(video.createdAt).toLocaleDateString()}
        </div>
        {canManage && (
          <button
            onClick={() => onRemove && onRemove(video.id)}
            className="mt-2 text-xs text-red-600 hover:text-red-700"
          >
            Remove from course
          </button>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return "--:--";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${`${s}`.padStart(2, "0")}`;
}
