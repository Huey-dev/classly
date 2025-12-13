"use client";

import Link from "next/link";
import Image from "next/image";
import SearchBar from "./SearchBar";
import { useEffect, useRef, useState } from "react";
import IconSearch from "../component/icons/IconSearch";
import { useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import { ProfileDropdown, type DropdownItem } from "./ProfileDropdown";
import { useTheme } from "next-themes";
import { unifiedSignOut } from "../lib/auth/signout";
export const Header = ({
  theme,
}: {
  theme: string;
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string | null; image?: string | null } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setUser({ name: data?.name, image: data?.image });
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleScroll = () => setDropdownOpen(false);
    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [dropdownOpen]);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

const signOutClick = async () => {
  // 1. Optimistically clear UI
  setUser(null);
  setDropdownOpen(false);

  // 2. Sign out (NextAuth + JWT + cookies)
  await unifiedSignOut("/signin");

  // 3. Force navigation (guarantees redirect)
  router.replace("/signin");
};

  const itemsDesktop: DropdownItem[] = [
    { label: "Profile", href: "/me" },
    { label: "Sign Out", onClick: signOutClick, danger: true },
  ];

  const itemsMobile: DropdownItem[] = [
    { label: "Profile", href: "/me" },
    { label: "Sign Out", onClick: signOutClick, danger: true },
  ];

  const handleAvatarClick = () => {
    if (!user) {
      router.push("/signup");
      return;
    }
    setDropdownOpen((v) => !v);
  };

  return (
    <header className="relative flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 shadow">
      <div className="flex items-center gap-2">
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
      </div>

      {/* Desktop search */}
      <div className="hidden md:block">
        <SearchBar />
      </div>

      <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
        {/* Mobile search toggle */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Search"
          onClick={() => setMobileSearchOpen((v) => !v)}
        >
          <IconSearch />
        </button>

        {/* Desktop-only auth buttons */}
        {!user && (
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/signin"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
            >
              Sign Up
            </Link>
          </div>
        )}

        <div className="hidden md:block">
          <UserAvatar user={user} size={32} onClick={handleAvatarClick} />
        </div>
        <div className="md:hidden">
          <UserAvatar user={user} size={24} onClick={handleAvatarClick} />
        </div>

        {/* Upload button (desktop) */}
        <Link
          href="/upload"
          className="px-12 py-2 bg-green-600 text-white rounded-full hover:bg-blue-700 transition-colors hidden md:block"
        >
          <span className="text-lg">+</span> <span>Upload</span>
        </Link>

        <ProfileDropdown
          open={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          items={isMobile ? itemsMobile : itemsDesktop}
          align="right"
        />
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
