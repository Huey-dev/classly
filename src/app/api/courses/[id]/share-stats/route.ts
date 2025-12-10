import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

function computeConversion(totalClicks: number, totalEnrollments: number) {
  if (!totalClicks || totalClicks <= 0) return 0;
  return Number(((totalEnrollments / totalClicks) * 100).toFixed(2));
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (course.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statsRecord = await prisma.courseShareStats.findUnique({
    where: { courseId_instructorId: { courseId, instructorId: course.userId } },
  });

  const totalClicks = statsRecord?.totalClicks ?? 0;
  const totalEnrollments = statsRecord?.totalEnrollments ?? 0;
  const conversionRate = computeConversion(totalClicks, totalEnrollments);

  if (statsRecord && statsRecord.conversionRate !== conversionRate) {
    await prisma.courseShareStats.update({
      where: { courseId_instructorId: { courseId, instructorId: course.userId } },
      data: { conversionRate },
    });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin ||
    "https://classlyr.vercel.app";

  return NextResponse.json({
    totalClicks,
    totalEnrollments,
    conversionRate,
    shareUrl: `${origin}/course/${courseId}?ref=${course.userId}`,
  });
}
