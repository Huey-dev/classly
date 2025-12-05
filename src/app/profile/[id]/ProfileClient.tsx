"use client";

import { useState } from "react";
import Link from "next/link";

type Profile = {
  user: { id: string; name: string | null; image: string | null; joined: string; videosCount: number };
  followers: number;
  following: number;
  likesReceived: number;
  videos: {
    id: string;
    title: string;
    muxPlaybackId: string | null;
    duration: number | null;
    createdAt: string;
    likes: number;
  }[];
  courses: {
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
  }[];
};

export default function ProfileClient({ profile }: { profile: Profile | null }) {
  if (!profile) return null;
  const { user, followers, following, likesReceived, videos, courses } = profile;
  const [tab, setTab] = useState<"wall" | "courses" | "videos" | "nfts">("wall");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="h-40 sm:h-48 bg-gradient-to-r from-purple-500 to-blue-500 rounded-b-3xl relative">
          <div className="absolute bottom-0 left-4 sm:left-6 translate-y-1/2">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden shadow-lg">
              {user.image ? (
                <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-14 gap-4">
            <div>
              <h1 className="text-2xl font-bold">{user.name || "Profile"}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                <span>{followers} Followers</span>
                <span>{following} Following</span>
                <span>{user.videosCount} Videos</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:shadow">
                Message
              </button>
              <button className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700">
                Follow
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
            {["wall", "courses", "videos", "nfts"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`pb-2 border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent"}`}
              >
                {t === "wall" ? "Wall" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "wall" && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Followers", value: followers },
                { label: "Following", value: following },
                { label: "Videos", value: user.videosCount },
                { label: "Likes Received", value: likesReceived },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tile.label}</div>
                  <div className="text-xl font-semibold">{tile.value}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "courses" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Courses</h3>
              {courses.length === 0 ? (
                <div className="text-sm text-gray-500">No courses yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
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
                          <span>•</span>
                          <span>{course.videoCount} videos</span>
                          <span>•</span>
                          <span>⭐ {course.rating ?? "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>👍 {course.likes}</span>
                          <span>•</span>
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
                          <span className="text-sm text-gray-700 dark:text-gray-200">{course.author.name || "Author"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "videos" && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.length === 0 ? (
                <div className="text-sm text-gray-500">No videos yet.</div>
              ) : (
                videos.map((v) => (
                  <Link
                    key={v.id}
                    href={`/video/${v.id}`}
                    className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow hover:shadow-md transition"
                  >
                    <div className="relative aspect-video bg-black">
                      {v.muxPlaybackId ? (
                        <img
                          src={`https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?time=1`}
                          alt={v.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">No thumb</div>
                      )}
                      <div className="absolute bottom-2 right-2 text-xs text-white bg-black/70 px-2 py-1 rounded">
                        {formatDuration(v.duration)}
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold line-clamp-2">{v.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatLikes(v.likes)} likes • {formatTimeSince(v.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === "nfts" && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold">NFTs</h3>
              <p className="text-sm text-gray-500">No NFTs yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLikes(count: number) {
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(count >= 100_000 ? 0 : 1)}K`;
  if (count < 1_000_000_000) return `${(count / 1_000_000).toFixed(count >= 100_000_000 ? 0 : 1)}M`;
  return `${(count / 1_000_000_000).toFixed(1)}B`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return "--:--";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = `${m}`.padStart(2, "0");
  const ss = `${s}`.padStart(2, "0");
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

function formatTimeSince(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const diff = Math.max(0, now.getTime() - then.getTime());

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes || 1}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
