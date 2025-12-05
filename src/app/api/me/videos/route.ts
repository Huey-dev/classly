import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = await prisma.content.findMany({
    where: { userId: user.id, type: "VIDEO" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      courseId: true,
      partNumber: true,
      status: true,
      muxPlaybackId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(videos);
}
