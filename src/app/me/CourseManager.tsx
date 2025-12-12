"use client";

import { useEffect, useState } from "react";

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const updateVisibility = async (visibility: "PUBLISHED" | "UNLISTED" | "DRAFT") => {
    if (!selectedCourse) {
      setMessage("Choose a course first");
      return;
    }
    try {
      const res = await fetch(`/api/courses/${selectedCourse}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update visibility");
      }
      const updated = await res.json();
      setCourses((prev) =>
        prev.map((c) => (c.id === selectedCourse ? { ...c, visibility: updated.visibility } : c))
      );
      setMessage(`Visibility set to ${visibility}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update visibility");
    }
  };

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

  const createCourse = async () => {
    if (!newTitle.trim()) {
      setMessage("Course title is required");
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
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create course");
      }
      const course = await res.json();
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
            disabled={creating}
            className={`w-full px-3 py-2 rounded-lg font-semibold ${
              creating ? "bg-gray-200 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {creating ? "Creating..." : "Create course"}
          </button>
          {selectedCourse && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Visibility: {courses.find((c) => c.id === selectedCourse)?.visibility || "N/A"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateVisibility("PUBLISHED")}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                >
                  Publish
                </button>
                <button
                  onClick={() => updateVisibility("UNLISTED")}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-white"
                >
                  Unlist
                </button>
                <button
                  onClick={() => updateVisibility("DRAFT")}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-300 text-gray-800"
                >
                  Draft
                </button>
              </div>
            </div>
          )}
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
