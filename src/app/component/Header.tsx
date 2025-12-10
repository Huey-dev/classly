"use client";

import Link from "next/link";
import Image from "next/image";
import SearchBar from "./SearchBar";
import { useState } from "react";
import IconSearch from "../component/icons/IconSearch";

export const Header = ({
  theme,
}: {
  theme: string;
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 shadow">
      <Link href="/" className="flex items-center select-none">
        <Image
          src="/cropped-logo.png"
          alt="Classly logo"
          width={70}
          height={70}
          className="h-9 w-auto md:h-12"
        />
        <span className="md:mx-[-21px] mx-[-19px] text-md font-bold text-black dark:text-white leading-none">
          lassly
        </span>
      </Link>

      {/* Desktop search */}
      <div className="hidden md:block">
        <SearchBar />
      </div>

      <div className="flex items-center space-x-3">
        {/* Mobile search toggle */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Search"
          onClick={() => setMobileSearchOpen((v) => !v)}
        >
          <IconSearch />
        </button>

        {/* Upload button (desktop) */}
        <Link
          href="/upload"
          className="px-12 py-2 bg-green-600 text-white rounded-full hover:bg-blue-700 transition-colors hidden md:block"
        >
          <span className="text-lg">+</span> <span>Upload</span>
        </Link>
      </div>

      {/* Mobile search drawer */}
      {mobileSearchOpen ? (
        <div className="absolute inset-x-0 top-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3 shadow-lg md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar />
            </div>
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
};
