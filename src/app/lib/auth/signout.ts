"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Unified sign-out for Classly
 *
 * What this does (in order):
 * 1. Ends NextAuth session (Google, etc.)
 * 2. Clears custom JWT cookies (/api/auth/signout)
 * 3. Redirects internally to /signin
 *
 * Why:
 * - Prevents zombie sessions
 * - Avoids Google logout loops
 * - Works for BOTH Google and email/password auth
 */
export async function unifiedSignOut(redirectTo: string = "/") {
  try {
    // 1) Kill NextAuth session (this clears next-auth cookies)
    await nextAuthSignOut({ redirect: false });

    // 2) Kill your custom JWT cookies
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
  } finally {
    // 3) Hard navigation reset (server + client state)
    window.location.href = redirectTo;
  }
}
