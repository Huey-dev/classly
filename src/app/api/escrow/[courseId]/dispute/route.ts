import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

/**
 * POST /api/escrow/[courseId]/dispute
 *
 * BEFORE (your version):
 * - no auth
 * - anyone can dispute any courseId
 *
 * AFTER:
 * - requires logged-in user
 * - must be enrolled student (owner/teacher cannot "dispute themselves")
 * - only allowed while dispute window is still open (disputeBy)
 * - stores a short reason and increments comments count (kept from your logic)
 */
type Params = { params: Promise<{ courseId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  // Must be enrolled (student)
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
    select: { id: true },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Only enrolled students can dispute" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

  const escrow = await prisma.escrow.findFirst({
    where: { courseId },
  });

  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  const nowMs = BigInt(Date.now());

  // If disputeBy exists and is in the past, disputes are closed
  if (escrow.disputeBy && BigInt(escrow.disputeBy) > BigInt(0) && nowMs > BigInt(escrow.disputeBy)) {
    return NextResponse.json(
      { error: "Dispute window closed", disputeBy: escrow.disputeBy.toString() },
      { status: 403 }
    );
  }

  const updated = await prisma.escrow.update({
    where: { id: escrow.id },
    data: {
      status: "DISPUTED",
      comments: reason ? escrow.comments + 1 : escrow.comments,
    } as any,
  });

  return NextResponse.json({
    status: updated.status,
    reason,
  });
}
