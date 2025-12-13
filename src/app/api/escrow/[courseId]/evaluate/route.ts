import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

/**
 * POST /api/escrow/[courseId]/evaluate
 *
 * Computes whether Release40 should be unlocked:
 * - Watch progress average >= 60% across enrolled students
 * - At least 1 comment (escrow.comments >= 1)
 * - At least 1 rating (escrow.ratingCount >= 1)
 *
 * Only the course owner can trigger evaluation (keeps it simple + abuse-resistant).
 */
type Params = { params: Promise<{ courseId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true, totalDuration: true, enrollmentCount: true },
  });

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (course.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const escrow = await prisma.escrow.findFirst({ where: { courseId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const totalDuration = course.totalDuration ?? 0;
  const enrollmentCount = course.enrollmentCount ?? 0;

  // If course has no duration or no enrollments, you cannot compute 60% meaningfully.
  if (totalDuration <= 0 || enrollmentCount <= 0) {
    return NextResponse.json({
      eligible: false,
      reason: "Missing course duration or enrollments",
      totalDuration,
      enrollmentCount,
    });
  }

  const agg = await prisma.courseWatchProgress.aggregate({
    where: { courseId },
    _sum: { watchedSeconds: true },
  });

  const totalWatched = agg._sum.watchedSeconds ?? 0;

  // Average watch % across enrolled students
  const avgWatchPct = totalWatched / (totalDuration * enrollmentCount);

  const hasEngagement = (escrow.comments ?? 0) >= 1 && (escrow.ratingCount ?? 0) >= 1;
  const meetsWatch = avgWatchPct >= 0.6;

  const eligible = hasEngagement && meetsWatch;

  const updated = await prisma.escrow.update({
    where: { id: escrow.id },
    data: {
      released40: eligible ? true : escrow.released40,
      allWatchMet: meetsWatch,
    } as any,
  });

  return NextResponse.json({
    eligible,
    avgWatchPct,
    hasEngagement,
    escrow: {
      released40: updated.released40,
      allWatchMet: updated.allWatchMet,
      comments: updated.comments,
      ratingCount: updated.ratingCount,
    },
  });
}
