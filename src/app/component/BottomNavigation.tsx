"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
// IMPORT YOUR SVG ICONS
const IconProfile = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"
    />
  </svg>
);

const IconUploadBox = () => (
  <div className="p-2 rounded-xl bg-green-600 flex items-center justify-center">
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 5v14M5 12h14"
      />
    </svg>
  </div>
);

const IconStar = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 2l2.9 6.6 7.1.6-5.3 4.7 1.6 7.1L12 17l-6.3 4 1.6-7.1L2 9.2l7.1-.6L12 2z"
    />
  </svg>
);

const IconHome = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l9-9 9 9M4 10v10h6V14h4v6h6V10"
    />
  </svg>
);

// Example:
// import HomeIcon from "@/components/icons/HomeIcon";
// import StarIcon from "@/components/icons/StarIcon";
// import UploadBoxIcon from "@/components/icons/UploadBoxIcon";
// import PersonIcon from "@/components/icons/PersonIcon";

export default function BottomNavigation({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
// Only mark as mounted on the client
  useEffect(() => setMounted(true), []);
  const nav = [
    
    { href: "/", label: "Explore", icon: <IconStar/> },
    {
      href: "/upload",
      label: "Upload",
      icon: (
        <div className="p-1 rounded-xl bg-green-600 flex items-center justify-center">
          <IconUploadBox />
        </div>
      ),
    },
    { href: "/me", label: "Me", icon: <IconProfile /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Main scrolling content */}
      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Persistent bottom nav */}
      <nav
        className="
        fixed bottom-0 left-0 right-0
        h-16 flex items-center justify-around
        bg-white dark:bg-gray-900
        border-t border-gray-200 dark:border-gray-800
        shadow-lg md:hidden
      "
      >
        {nav.map(({ href, label, icon }) => {
          const active = mounted && pathname === href;

          return (
            <Link
              href={href}
              key={href}
              className="flex flex-col items-center justify-center w-full h-full"
            >
              <div
                className={
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-300"
                }
              >
                {icon}
              </div>
              <span className={`text-xs ${active ? "font-semibold" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
