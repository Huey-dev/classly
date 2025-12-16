"use client";

import { useState } from "react";
import Link from "next/link";
import SettingsMenu from "./SettingsMenu";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  bannerImage?: string | null;
};

type Props = {
  user: User;
  stats: { followers: number; following: number; videos: number };
};

export default function ProfileHeader({ user: initialUser, stats }: Props) {
  const [user, setUser] = useState<User>(initialUser);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialUser.name ?? "");
  const [image, setImage] = useState(initialUser.image ?? "");
  const [bannerImage, setBannerImage] = useState(initialUser.bannerImage ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const banner =
    user.bannerImage ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80";
  const avatar =
    user.image ||
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80";

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image: image.trim(),
          bannerImage: bannerImage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      setUser((prev) => ({ ...prev, ...data }));
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
      <div className="relative h-44 sm:h-52">
        <img src={banner} alt="Banner" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute -bottom-10 left-4 flex items-end gap-3">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100">
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
          </div>
          <div className="pb-2">
            <p className="text-lg font-semibold text-white">{user.name || user.email}</p>
            <p className="text-xs text-gray-200">{user.email}</p>
            <div className="flex items-center gap-3 text-xs text-gray-200 mt-2">
              <span>{stats.followers} Followers</span>
              <span>{stats.following} Following</span>
              <span>{stats.videos} Videos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-12 pb-4 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span>Manage your profile, wallet, courses, and NFTs from one place.</span>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setEditing(true)}
          >
            Edit profile
          </button>
          <Link
            href="/upload"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Upload
          </Link>
          <SettingsMenu />
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-5">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Edit profile</h3>
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 space-y-1">
                Display name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  placeholder="Your name"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 space-y-1">
                Avatar URL
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  placeholder="https://example.com/avatar.png"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 space-y-1 md:col-span-2">
                Banner image URL
                <input
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  placeholder="https://example.com/banner.jpg"
                />
              </label>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-200 px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
