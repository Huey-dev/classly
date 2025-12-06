import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const privateRoutes = ["/dashboard", "/me", "/upload", "/course", "/profile/edit"];

const { auth } = NextAuth(authConfig);
export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const isLoginRoute = nextUrl.pathname.startsWith("/signin");

  if (isLoggedIn && isLoginRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (
    !isLoggedIn &&
    privateRoutes.some((route) => nextUrl.pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/dashboard/:path*",
    "/signin",
    "/signup",
    "/onboarding",
    "/classroom/:path*",
    "/upload",
    "/profile/:path*",
    "/course/:path*",
    "/me",
  ],
};
