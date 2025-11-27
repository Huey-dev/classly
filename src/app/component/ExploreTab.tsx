"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  {
    key: "explore",
    label: "Explore",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path
          d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "trending",
    label: "Trending",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path
          d="M3 17l6-6 4 4 8-8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="4" r="1" />
      </svg>
    ),
  },
  {
    key: "my-videos",
    label: "My Videos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path
          d="M4 4h16v12H4z"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 20h8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "recommend",
    label: "For You",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path
          d="M12 21l-8-9a5 5 0 118-6 5 5 0 118 6l-8 9z"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function ExploreTab() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = pathname.includes(tab.key);

        return (
          <button
            key={tab.key}
            onClick={() => router.push(`/explore/${tab.key}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border 
              transition whitespace-nowrap
              ${
                isActive
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300 dark:border-gray-600"
              }
            `}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
