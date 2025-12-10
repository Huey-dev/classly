"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Header } from "./Header";
import ExploreTab from "./ExploreTab";
import { IconMoon } from "../component/icons/IconMoon";
import { IconSun } from "./icons/IconSun";

// --- Sidebar Navigation Link Component ---
function NavLink({
  href,
  icon,
  label,
  active = false,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
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

// --- Main Client Layout Component ---
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch by waiting for client mount before rendering theme-dependent UI
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header - Fixed Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <Header
          theme={theme || "light"}
        />
      </header>

      {/* Main Layout: Sidebar and Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:relative z-40 h-[calc(100vh-64px)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:w-56 md:translate-x-0"
          } overflow-y-auto flex-shrink-0`}
        >
          <nav className="p-4 space-y-2 pt-4">
            <NavLink href="/" icon="" label="Home" active onClick={() => setSidebarOpen(false)} />

            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            <a
              href="/student"
              onClick={() => setSidebarOpen(false)}
              className="block w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Student 
            </a>
            <a
              href="/signup"
              onClick={() => setSidebarOpen(false)}
              className="block w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign up
            </a>
            <a
              href="/signin"
              onClick={() => setSidebarOpen(false)}
              className="block w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign in
            </a>
            <a
              href="/signout"
              onClick={() => setSidebarOpen(false)}
              className="block w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign out
            </a>
            {/* profile */}
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            <NavLink href="/me" icon="" label="Profile" onClick={() => setSidebarOpen(false)} />
            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            {/* Dark Mode Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 flex gap-2 items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Toggle dark mode"
              >
                Toogle mode{theme === "light" ? <IconMoon /> : <IconSun />}
              </button>
            )}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-3 sm:px-4 md:px-0">
            <ExploreTab />
          </div>
          {/* Video sections (continue watching + recently added) */}
          <div className="px-3 sm:px-4 md:px-0 pb-6">{children}</div>
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
