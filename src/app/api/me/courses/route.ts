// src/app/api/me/courses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    where: {
      userId: user.id,
        // only monetized courses
      isPaid: true,
      // Or only courses with price
      priceAda: { gt: 0 },
    },
    include: {
      _count: { select: { enrollments: true } },
      escrowLinks: { orderBy: { lockedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  // Shape it for the dashboard (lean payload)
  const shaped = courses.map((c) => ({
    id: c.id,
    title: c.title,
    coverImage: c.coverImage,
    priceAda: c.priceAda,
    visibility: c.visibility,
    enrollmentCount: c._count.enrollments,
    escrow: c.escrowLinks[0] ?? null,
  }));

  return NextResponse.json(shaped);
}
