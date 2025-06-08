import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function setAuthCookies(userId: string) {
  const JWT_SECRET = process.env.JWT_SECRET_KEY!;
  const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY!;

  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });

  const store = await cookies(); // await here is required!
  store.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
    sameSite: "strict",
  });
  store.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
    sameSite: "strict",
  });
}

export async function clearAuthCookies() {
  const store = await cookies(); // await here too
  store.set("accessToken", "", { maxAge: 0, path: "/" });
  store.set("refreshToken", "", { maxAge: 0, path: "/" });
}
