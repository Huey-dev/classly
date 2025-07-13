import { auth } from "../../../../../auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export async function PATCH() {
  const session = await auth();
  
  const prisma = new PrismaClient();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasOnboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
