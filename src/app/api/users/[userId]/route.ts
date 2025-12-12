import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get user" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await params;
  const current = await getUserFromRequest();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (current.id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : null;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletAddress },
      select: { id: true, walletAddress: true },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update wallet error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update wallet" },
      { status: 500 }
    );
  }
}

