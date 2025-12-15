// src/app/api/escrow/[courseId]/eligibility/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/escrow/[courseId]/eligibility
 *
 * PURE eligibility oracle.
 * - No wallet
 * - No frontend trust
 * - No mutation
 *
 * Determines whether:
 * 1) Initial 30% can be withdrawn (>= 5 enrollments)
 * 2) Metrics-based 40% can be withdrawn (>= 60% avg watch + engagement)
 * 3) Final 30% can be withdrawn (14 days passed, no dispute)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  /* ---------------------------------------------
   * 1. Fetch course-level facts
   * --------------------------------------------- */
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      totalDuration: true,      // seconds
      enrollmentCount: true,    // cached count
    },
  });

  // Hard guard: eligibility math is meaningless without these
  if (
    !course ||
    course.totalDuration === null ||
    course.totalDuration <= 0 ||
    course.enrollmentCount === null ||
    course.enrollmentCount <= 0
  ) {
    return NextResponse.json({
      eligible: false,
      reason: "Course duration or enrollment not initialized",
    });
  }

  // From here on, TS knows these are numbers
  const totalDuration = course.totalDuration;
  const enrollmentCount = course.enrollmentCount;

  /* ---------------------------------------------
   * 2. Fetch escrow state
   * --------------------------------------------- */
  const escrow = await prisma.escrow.findFirst({
    where: { courseId },
  });

  if (!escrow) {
    return NextResponse.json({
      eligible: false,
      reason: "Escrow not found",
    });
  }

  /* ---------------------------------------------
   * 3. Initial 30% eligibility
   * --------------------------------------------- */
  const initial30Eligible =
    escrow.paidCount >= 5 && !escrow.released30;

  /* ---------------------------------------------
   * 4. Aggregate watch progress
   * --------------------------------------------- */
  const watchAgg = await prisma.courseWatchProgress.aggregate({
    where: { courseId },
    _sum: { watchedSeconds: true },
  });

  const totalWatchedSeconds = watchAgg._sum.watchedSeconds ?? 0;

  // Average watch % across all enrolled students
  const avgWatchPct =
    totalWatchedSeconds / (totalDuration * enrollmentCount);

  const watchMet = avgWatchPct >= 0.6;

  /* ---------------------------------------------
   * 5. Engagement checks
   * --------------------------------------------- */
  const hasEngagement =
    (escrow.comments ?? 0) >= 1 &&
    (escrow.ratingCount ?? 0) >= 1;

  const metrics40Eligible =
    escrow.released30 &&
    !escrow.released40 &&
    watchMet &&
    hasEngagement;

  /* ---------------------------------------------
   * 6. Final 30% (time-locked)
   * --------------------------------------------- */
  const nowSeconds = Math.floor(Date.now() / 1000);

  const final30Eligible =
    escrow.released40 &&
    !escrow.releasedFinal &&
    escrow.disputeBy !== null &&
    nowSeconds >= escrow.disputeBy;

  /* ---------------------------------------------
   * 7. Return oracle result
   * --------------------------------------------- */
  return NextResponse.json({
    eligibility: {
      initial30: initial30Eligible,
      metrics40: metrics40Eligible,
      final30: final30Eligible,
    },
    metrics: {
      avgWatchPct: Number((avgWatchPct * 100).toFixed(2)), // %
      watchMet,
      enrollmentCount,
      totalDuration,
      totalWatchedSeconds,
      comments: escrow.comments ?? 0,
      ratingCount: escrow.ratingCount ?? 0,
      paidCount: escrow.paidCount,
      disputeBy: escrow.disputeBy,
    },
  });
}
