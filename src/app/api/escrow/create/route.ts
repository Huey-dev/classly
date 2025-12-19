import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";
import { hashCourseId } from "../../../lib/escrow-utils";

/**
 * POST /api/escrow/pay
 *
 * Called when a student pays for a course.
 * This represents the OFF-CHAIN accounting mirror of the on-chain escrow lock.
 *
 * Responsibilities:
 * - Ensure user is authenticated
 * - Ensure course exists
 * - Create enrollment (idempotent)
 * - Increment Course.enrollmentCount
 * - Increment Escrow.paidCount
 * - Add netAmount to Escrow.netTotal (locked)
 *
 * IMPORTANT:
 * - No funds are released here
 * - This does NOT decide eligibility
 * - This does NOT build a Cardano transaction
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const courseId = String(body.courseId || "");
  const netAmount = Number(body.netAmount || 0); // lovelace, AFTER platform fee
  const scriptAddress = typeof body.scriptAddress === "string" ? body.scriptAddress.trim() : null;
  const receiverPkh = typeof body.receiverPkh === "string" ? body.receiverPkh.trim() : null;
  const oraclePkh = typeof body.oraclePkh === "string" ? body.oraclePkh.trim() : null;
  const courseIdHash = courseId ? hashCourseId(courseId) : null;

  if (!courseId || netAmount <= 0) {
    return NextResponse.json(
      { error: "Invalid courseId or amount" },
      { status: 400 }
    );
  }
 // Ensure the course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // 1️⃣ Ensure enrollment (idempotent)
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
    select: { id: true },
  });

  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: { courseId, userId: user.id },
    });

    // cached count keeps escrow math fast + deterministic
    await prisma.course.update({
      where: { id: courseId },
      data: { enrollmentCount: { increment: 1 } },
    });
  }

// Update or create the escrow row. Because courseId is not unique in your schema,
  // we must find the existing escrow row by courseId first; if it exists, update
  // it by incrementing netTotal and paidCount; otherwise create a new row.
  const existingEscrow = await prisma.escrow.findFirst({ where: { courseId } });
  if (!existingEscrow) {
    return NextResponse.json(
      { error: "Escrow not initialized for this course. Initialize on-chain first." },
      { status: 400 }
    );
  }

  const existingHash = (existingEscrow as any).courseIdHash as string | null | undefined;
  const escrow = await prisma.escrow.update({
    where: { id: existingEscrow.id },
    data: {
      netTotal: { increment: netAmount },
      paidCount: { increment: 1 },
      ...(scriptAddress ? { scriptAddress } : {}),
      ...(receiverPkh ? { receiverPkh } : {}),
      ...(oraclePkh ? { oraclePkh } : {}),
      ...(courseIdHash && !existingHash ? { courseIdHash } : {}),
    },
  });

  // Return a lean payload
  return NextResponse.json({
    success: true,
    escrow: {
      netTotal: escrow.netTotal,
      paidCount: escrow.paidCount,
      scriptAddress: escrow.scriptAddress,
    },
  });
}
