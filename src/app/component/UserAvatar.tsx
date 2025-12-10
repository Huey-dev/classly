'use client';

import Image from 'next/image';
import React from 'react';

export type UserAvatarProps = {
  user: { name?: string | null; image?: string | null } | null;
  size: number;
  onClick?: () => void;
};

export function UserAvatar({ user, size, onClick }: UserAvatarProps) {
  if (user?.image) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-full overflow-hidden border border-slate-200 dark:border-slate-700"
        style={{ width: size, height: size }}
        aria-label="Open user menu"
      >
        <Image src={user.image} alt={user.name || 'Profile'} width={size} height={size} className="object-cover" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label="Open user menu"
    >
      <IconUser />
    </button>
  );
}

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20c0-3.333 2.667-6 6-6s6 2.667 6 6" />
  </svg>
);
