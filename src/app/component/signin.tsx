// app/component/signin.tsx
"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

/**
 * Canonical Google OAuth entry point.
 *
 * IMPORTANT:
 * - No callbackUrl override
 * - NextAuth internally handles Google → callback → session
 * - PrismaAdapter auto-creates the user if they don’t exist
 *
 * This works for BOTH:
 * - Existing users (sign in)
 * - New users (account creation)
 */
export default function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="w-full px-5 py-3 rounded-lg border border-gray-200 bg-white flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition"
    >
      <span>Continue with Google</span>
      <Image src="/google.svg" alt="Google" width={18} height={18} />
    </button>
  );
}
