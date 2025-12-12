import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Prisma } from "@prisma/client";

function serializeEscrow(row: any) {
  if (!row) return row;
  return {
    ...row,
    netTotal: row.netTotal ? row.netTotal.toString() : "0",
    paidOut: row.paidOut ? row.paidOut.toString() : "0",
    adaAmount: row.adaAmount ? row.adaAmount.toString() : null,
    firstWatch: row.firstWatch !== null && row.firstWatch !== undefined ? row.firstWatch.toString() : "0",
    disputeBy: row.disputeBy !== null && row.disputeBy !== undefined ? row.disputeBy.toString() : "0",
  };
}

/**
 * POST /api/escrow/sync
 * Upserts escrow row for demo purposes after a client-side transaction.
 * Expects coarse fields; does not validate on-chain state.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId } = body || {};
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const data: Prisma.EscrowUncheckedCreateInput = {
      courseId,
      teacherId: body.teacherId ?? null,
      studentId: body.studentId ?? null,
      adaAmount: body.adaAmount ? new Prisma.Decimal(body.adaAmount) : new Prisma.Decimal(0),
      receiverPkh: body.receiverPkh ?? null,
      oraclePkh: body.oraclePkh ?? null,
      scriptAddress: body.scriptAddress ?? null,
      netTotal: body.netTotal ? new Prisma.Decimal(body.netTotal) : new Prisma.Decimal(0),
      paidCount: body.paidCount ?? 0,
      paidOut: body.paidOut ? new Prisma.Decimal(body.paidOut) : new Prisma.Decimal(0),
      released30: !!body.released30,
      released40: !!body.released40,
      releasedFinal: !!body.releasedFinal,
      comments: body.comments ?? 0,
      ratingSum: body.ratingSum ?? 0,
      ratingCount: body.ratingCount ?? 0,
      allWatchMet: body.allWatchMet ?? true,
      firstWatch: BigInt(body.firstWatch ?? 0),
      disputeBy: BigInt(body.disputeBy ?? 0),
      status: body.status ?? "PENDING",
    } satisfies Parameters<typeof prisma.escrow.create>[0]["data"];

    const existing = await prisma.escrow.findFirst({ where: { courseId } });
    const escrow = existing
      ? await prisma.escrow.update({ where: { id: existing.id }, data })
      : await prisma.escrow.create({ data });

    return NextResponse.json({ escrow: serializeEscrow(escrow) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Sync failed" }, { status: 500 });
  }
}
