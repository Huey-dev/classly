import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { hasOnboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
