import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite: "strict",
  });
  cookieStore.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite: "strict",
  });
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
