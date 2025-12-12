import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

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

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    const escrow = await prisma.escrow.findFirst({
      where: { courseId },
    });

    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    return NextResponse.json(serializeEscrow(escrow));
  } catch (e: any) {
    if (e?.code === "P1001") {
      // DB unreachable; return a demo placeholder so UI doesn't crash
      return NextResponse.json(
        {
          id: "demo-escrow",
          courseId,
          receiverPkh: null,
          oraclePkh: null,
          scriptAddress: null,
          netTotal: "0",
          paidCount: 0,
          paidOut: "0",
          released30: false,
          released40: false,
          releasedFinal: false,
          comments: 0,
          ratingSum: 0,
          ratingCount: 0,
          allWatchMet: true,
          firstWatch: 0,
          disputeBy: 0,
          status: "PENDING",
        },
        { status: 200 }
      );
    }
    throw e;
  }
}
