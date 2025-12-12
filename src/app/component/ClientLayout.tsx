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
          className="hidden md:flex flex-col sticky top-[64px] z-10 h-[calc(100vh-64px)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0 w-56"
          aria-label="Primary navigation"
        >
          <nav className="p-4 space-y-2 pt-4 flex-1">
            <a
              href="/dashboard"
              className="block w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Dashboard 
            </a>
          </nav>
          {/* Dark Mode Toggle bottom-left */}
          {mounted && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 flex items-center justify-center w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Toggle dark mode"
              >
                {theme === "light" ? <IconMoon /> : <IconSun />}
              </button>
            </div>
          )}
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
      </div>
  );
}
