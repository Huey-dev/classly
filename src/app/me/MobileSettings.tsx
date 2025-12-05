"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "../component/ThemeToggle";

export default function MobileSettings() {
  const { theme = "light", setTheme } = useTheme();

  return (
    <div className="md:hidden mt-4 space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Appearance</span>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200 transition font-semibold text-sm"
      >
        Sign out
      </button>
    </div>
  );
}
