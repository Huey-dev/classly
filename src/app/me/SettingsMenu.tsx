"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const { theme = "light", setTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow"
        aria-label="Settings"
      >
        <SettingsIcon />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2 space-y-1 z-10">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span>Toggle theme</span>
            <span className="text-xs text-gray-500">{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
              } finally {
                await signOut({ redirect: false });
                window.location.href = "https://accounts.google.com/Logout";
              }
            }}
            className="w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 10.91 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
