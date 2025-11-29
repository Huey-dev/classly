import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.content.findMany({
    where: {
      type: "VIDEO",
      status: "READY",
      muxPlaybackId: { not: null },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { author: { name: { contains: q, mode: "insensitive" } }},
      ],
    },
    include: {
      author: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({ results });
}
