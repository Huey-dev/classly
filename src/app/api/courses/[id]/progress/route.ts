import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

/**
 * POST /api/courses/[id]/progress
 * Body: { watchedSecDelta: number }
 *
 * - Only enrolled students can post progress.
 * - We store cumulative watched seconds per user per course.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const body = await req.json().catch(() => ({}));
  const watchedSecDelta = Number(body?.watchedSecDelta || 0);

  if (!Number.isFinite(watchedSecDelta) || watchedSecDelta <= 0) {
    return NextResponse.json({ error: "watchedSecDelta must be a positive number" }, { status: 400 });
  }

  // Must be enrolled
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
    select: { id: true },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enroll first" }, { status: 403 });
  }

  const progress = await prisma.courseWatchProgress.upsert({
    where: { userId_courseId: { courseId, userId: user.id } },
    update: { watchedSeconds: { increment: Math.floor(watchedSecDelta) } },
    create: { courseId, userId: user.id, watchedSeconds: Math.floor(watchedSecDelta) },
    select: { watchedSeconds: true },
  });

  return NextResponse.json({ watchedSec: progress.watchedSeconds });
}

/**
 * GET /api/courses/[id]/progress
 *
 * Returns aggregated watch progress for a course. Used by the creator
 * dashboard to evaluate engagement eligibility. Only the course owner or
 * an enrolled student can view this data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Allow course owner or enrolled student
  if (course.userId !== user.id) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, userId: user.id },
      select: { id: true },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const agg = await prisma.courseWatchProgress.aggregate({
    where: { courseId },
    _sum: { watchedSeconds: true },
  });

  return NextResponse.json({
    totalWatchSeconds: Number(agg._sum.watchedSeconds ?? 0),
  });
}
