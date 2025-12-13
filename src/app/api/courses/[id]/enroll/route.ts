import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

/**
 * GET: returns whether current user is enrolled.
 * POST: enrolls current user (idempotent) and bumps Course.enrollmentCount cache.
 *
 * BEFORE:
 * - enrollment created, but Course.enrollmentCount never updated
 *
 * AFTER:
 * - same behavior + updates cached enrollmentCount so UI/escrow math is consistent
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ enrolled: false });

  const { id: courseId } = await params;

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
  });

  return NextResponse.json({ enrolled: !!enrollment });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    await prisma.enrollment.create({
      data: { courseId, userId: user.id },
    });

    // Keep the cached count honest (Course.enrollmentCount exists in schema :contentReference[oaicite:3]{index=3})
    await prisma.course.update({
      where: { id: courseId },
      data: { enrollmentCount: { increment: 1 } },
    });
  }

  return NextResponse.json({ enrolled: true });
}
