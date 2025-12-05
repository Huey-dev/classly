import { auth } from "../../auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

export async function getUserFromRequest() {
  try {
    // 1. Try NextAuth OAuth session
    const session = await auth();
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) return user;
    }

    // 2. Try JWT token
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) return null;

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET_KEY!) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      return user;
    } catch (err) {
      console.error("Invalid JWT token:", err);
      return null;
    }
  } catch (err) {
    // Any DB/network failures should not crash the route; fall back to unauthenticated
    console.warn("getUserFromRequest failed, returning null:", err);
    return null;
  }
}
