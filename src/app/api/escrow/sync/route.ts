import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

/**
 * Serialize Decimal/BigInt fields so NextResponse.json doesn't throw.
 */
function serializeEscrow(row: any) {
  if (!row) return row;
  return {
    ...row,
    netTotal: row.netTotal ? row.netTotal.toString() : "0",
    paidOut: row.paidOut ? row.paidOut.toString() : "0",
    adaAmount: row.adaAmount ? row.adaAmount.toString() : "0",
    firstWatch:
      row.firstWatch !== null && row.firstWatch !== undefined
        ? row.firstWatch.toString()
        : "0",
    disputeBy:
      row.disputeBy !== null && row.disputeBy !== undefined
        ? row.disputeBy.toString()
        : "0",
  };
}

/**
 * POST /api/escrow/sync
 *
 * BEFORE (your version):
 * - duplicated code block (same handler pasted twice)
 * - no auth check
 * - trusts client payload to upsert escrow rows for any course
 *
 * AFTER (this version):
 * - single handler (no duplication)
 * - requires auth
 * - only allows:
 *   - teacher (course owner) OR
 *   - an enrolled student (optional, if you want students to "sync" after paying)
 * - still "coarse" (demo) but no longer wide open
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { courseId } = body || {};

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // Load course + ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, userId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Allow course owner OR enrolled student
    const isOwner = course.userId === user.id;
    const isEnrolled = await prisma.enrollment.findFirst({
      where: { courseId, userId: user.id },
      select: { id: true },
    });

    if (!isOwner && !isEnrolled) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Note: We still keep this "unchecked" input for demo speed,
    // but we now control who can write it.
    const data: Prisma.EscrowUncheckedCreateInput = {
      courseId,
      teacherId: body.teacherId ?? null,
      studentId: body.studentId ?? null,
      adaAmount: body.adaAmount ? new Prisma.Decimal(body.adaAmount) : new Prisma.Decimal(0),

      receiverPkh: body.receiverPkh ?? null,
      oraclePkh: body.oraclePkh ?? null,
      scriptAddress: body.scriptAddress ?? null,

      netTotal: body.netTotal ? new Prisma.Decimal(body.netTotal) : new Prisma.Decimal(0),
      paidCount: typeof body.paidCount === "number" ? body.paidCount : 0,
      paidOut: body.paidOut ? new Prisma.Decimal(body.paidOut) : new Prisma.Decimal(0),

      released30: !!body.released30,
      released40: !!body.released40,
      releasedFinal: !!body.releasedFinal,

      comments: typeof body.comments === "number" ? body.comments : 0,
      ratingSum: typeof body.ratingSum === "number" ? body.ratingSum : 0,
      ratingCount: typeof body.ratingCount === "number" ? body.ratingCount : 0,

      allWatchMet: typeof body.allWatchMet === "boolean" ? body.allWatchMet : true,

      // BigInt fields must be coerced safely
      firstWatch: BigInt(body.firstWatch ?? 0),
      disputeBy: BigInt(body.disputeBy ?? 0),

      status: typeof body.status === "string" ? body.status : "PENDING",
    } satisfies Parameters<typeof prisma.escrow.create>[0]["data"];

    // Upsert by courseId (since courseId is not unique in schema)
    const existing = await prisma.escrow.findFirst({ where: { courseId } });

    const escrow = existing
      ? await prisma.escrow.update({ where: { id: existing.id }, data })
      : await prisma.escrow.create({ data });

    return NextResponse.json({ escrow: serializeEscrow(escrow) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Sync failed" }, { status: 500 });
  }
}
