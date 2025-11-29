"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Header } from "./Header";
import Image from "next/image";
import ExploreTab from "./ExploreTab";
import { IconMoon } from "../component/icons/IconMoon";
import { IconSun } from "./icons/IconSun";
import { IconMenu } from "./icons/IconMenu";

// --- Sidebar Navigation Link Component ---
function NavLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-4 px-4 py-2 rounded-lg transition-colors ${
        active
          ? "bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

// --- Video Card Component for Recommended Section ---
function RecommendedVideoCard({
  video,
}: {
  video: {
    id: number;
    title: string;
    thumbnail: string;
    author: string;
    views: string;
    time: string;
  };
}) {
  return (
    <a
      href={`/video/${video.id}`}
      className="flex-shrink-0 w-64 cursor-pointer group"
    >
      <div className="relative w-full pb-[56.25%] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:brightness-75 transition-all"
        />
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {video.title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {video.author}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {video.views} • {video.time}
        </p>
      </div>
    </a>
  );
}

// --- Main Client Layout Component ---
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Mock data for recommended videos
  const RECOMMENDED_VIDEOS = [
    {
      id: 1,
      title: "Eye Makeup Tips for Beginners",
      thumbnail:
        "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400",
      author: "Beauty Guru",
      views: "45K views",
      time: "3 days ago",
    },
    {
      id: 2,
      title: "Tricks in making corset",
      thumbnail:
        "https://images.unsplash.com/photo-1558769132-cb1aea9c3d8f?w=400",
      author: "Fashion Designer",
      views: "12K views",
      time: "1 week ago",
    },
    {
      id: 3,
      title: "Advanced Styling Techniques",
      thumbnail:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
      author: "Style Master",
      views: "89K views",
      time: "2 days ago",
    },
    {
      id: 4,
      title: "DIY Fashion Hacks",
      thumbnail:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400",
      author: "Creative Lab",
      views: "23K views",
      time: "5 days ago",
    },
    {
      id: 5,
      title: "Seasonal Makeup Trends",
      thumbnail:
        "https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400",
      author: "Trend Setter",
      views: "67K views",
      time: "1 day ago",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header - Fixed Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <Header
          openSidebar={() => setSidebarOpen(true)}
          theme={theme || "light"}
        />
      </header>

      {/* Main Layout: Sidebar and Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:relative z-40 h-[calc(100vh-64px)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-0 md:w-64"
          } overflow-y-auto flex-shrink-0`}
        >
          <nav className="p-4 space-y-2 pt-4">
            <NavLink href="/" icon="🏠" label="Home" active />

            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            <a
              href="/signup"
              className="block w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign up
            </a>
            <a
              href="/signin"
              className="block w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign in
            </a>
            <a
              href="/signout"
              className="block w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign out
            </a>
            {/* profile */}
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            <NavLink href="/profile" icon="👤" label="Profile" />
            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 flex gap-2 items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Toggle dark mode"
            >
              Toogle mode{theme === "light" ? <IconMoon /> : <IconSun />}
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Recommended Videos Section (Horizontal Scroll) */}
          <ExploreTab />
          <section className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Continue watching...
            </h2>
            <div className="overflow-x-auto scrollbar-hide pb-2">
              <div className="flex gap-4 min-w-min">
                {RECOMMENDED_VIDEOS.map((video) => (
                  <RecommendedVideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          </section>

          {/* Recently Uploaded Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Recently Uploaded
            </h2>

            {/* Server Component (VideoGrid) goes here */}
            {children}
          </section>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
