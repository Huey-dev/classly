"use client";

import { useState } from "react";
import Link from "next/link";
import CourseManager from "./CourseManager";

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

export default function MeContent({
  dashboard,
  courses,
}: {
  dashboard: Dashboard;
  courses: Course[];
}) {
  const [tab, setTab] = useState<"wall" | "courses" | "nfts">("wall");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
        {["wall", "courses", "nfts"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`pb-2 border-b-2 ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent"
            }`}
          >
            {t === "wall" ? "My Wall" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

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
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">NFTs</h3>
          <p className="text-sm text-gray-500">No NFTs yet.</p>
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
