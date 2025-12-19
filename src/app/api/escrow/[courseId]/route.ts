import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * Serialize Decimal/BigInt fields so NextResponse.json doesn't throw.
 * Converts database numeric types to strings for safe JSON serialization.
 */
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

/**
 * GET /api/escrow/[courseId]
 * 
 * Returns the escrow state for a given course. If no escrow exists yet
 * (course created but no payments received), this endpoint automatically
 * creates an empty escrow record with default values.
 * 
 * This prevents 404 errors when viewing courses in the creator dashboard
 * before any students have enrolled.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  
  // Validate courseId parameter
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    // Try to find existing escrow record
    let escrow = await prisma.escrow.findFirst({
      where: { courseId },
    });

    // If no escrow exists, create a default one
    // This handles courses that have been created but haven't received any payments yet.
    // The dashboard can now display "0 students, 0 ADA locked" instead of crashing.
    if (!escrow) {
      const nowMs = BigInt(Date.now());
      escrow = await prisma.escrow.create({
        data: {
          courseId,
          netTotal: 0,          // No payments received yet
          paidCount: 0,         // No students have paid yet
          paidOut: 0,           // No funds released to instructor yet
          released30: false,    // Initial 30% not yet released
          released40: false,    // Engagement 40% not yet released
          releasedFinal: false, // Final 30% not yet released
          comments: 0,          // No comments yet
          ratingSum: 0,         // No ratings yet
          ratingCount: 0,       // No rating count
          allWatchMet: true,    // Default to true (no students to violate)
          firstWatch: 0n,
          disputeBy: nowMs + 14n * 24n * 60n * 60n * 1000n,
          status: 'PENDING',    // Waiting for first payment
        },
      });
    }

    // Return serialized escrow data
    return NextResponse.json(serializeEscrow(escrow));
    
  } catch (e: any) {
    // Handle database connection errors gracefully
    // P1001 = database unreachable
    if (e?.code === "P1001") {
      // Return a demo placeholder so UI doesn't crash during development
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
          firstWatch: "0",
          disputeBy: "0",
          status: "PENDING",
        },
        { status: 200 }
      );
    }
    // Re-throw other errors to be handled by Next.js error handling
    throw e;
  }
}
