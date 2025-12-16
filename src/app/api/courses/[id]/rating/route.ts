import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const body = await req.json().catch(() => ({}));
  const rating = Number(body.rating);

  if (!courseId) return NextResponse.json({ error: "Course id required" }, { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, averageRating: true, ratingCount: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: "Enroll to rate this course" }, { status: 403 });

  const currentCount = course.ratingCount ?? 0;
  const currentAvg = course.averageRating ?? 0;
  const nextCount = currentCount + 1;
  const nextAvg = Number(((currentAvg * currentCount + rating) / nextCount).toFixed(2));

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      ratingCount: nextCount,
      averageRating: nextAvg,
    },
    select: { averageRating: true, ratingCount: true },
  });

  await prisma.escrow.updateMany({
    where: { courseId },
    data: {
      ratingSum: { increment: rating },
      ratingCount: { increment: 1 },
    },
  });

  return NextResponse.json({
    averageRating: updated.averageRating ?? null,
    ratingCount: updated.ratingCount ?? 0,
  });
}
