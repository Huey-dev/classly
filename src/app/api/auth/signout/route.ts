import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function clearAuthCookies() {
  const cookieStore = await cookies();
  const expireOpts = (sameSite: "strict" | "lax") => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite,
  });

  // Custom JWT cookies (local auth)
  cookieStore.set("accessToken", "", expireOpts("strict"));
  cookieStore.set("refreshToken", "", expireOpts("strict"));

  // NextAuth / Auth.js session cookies (Google, etc.)
  cookieStore.set("next-auth.session-token", "", expireOpts("lax"));
  cookieStore.set("__Secure-next-auth.session-token", "", expireOpts("lax"));
  cookieStore.set("authjs.session-token", "", expireOpts("lax"));
  cookieStore.set("__Secure-authjs.session-token", "", expireOpts("lax"));
}

export async function POST() {
  await clearAuthCookies();
  return NextResponse.json({ message: "Logged out" }, { status: 200 });
}

// Support GET for callers that hit this endpoint directly (e.g., browser navigation)
export async function GET() {
  await clearAuthCookies();
  return NextResponse.json({ message: "Logged out" }, { status: 200 });
}
