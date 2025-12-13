import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { getUserFromRequest } from "../.../../../../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/courses/[id]/nft-claim/prepare
 *
 * Creates or resumes an NFT mint claim after validating:
 * - authentication
 * - enrollment
 * - course completion
 * - NFT config
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const { id: courseId } = await params;

    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientAddress, payerAddress } = await req.json();
    if (!recipientAddress || !payerAddress) {
      return NextResponse.json(
        { error: "recipientAddress and payerAddress are required" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, userId: user.id },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    const completion = await prisma.courseCompletion.findFirst({
      where: { courseId, userId: user.id, status: "COMPLETED" },
    });
    if (!completion) {
      return NextResponse.json({ error: "Course not completed" }, { status: 400 });
    }

    const config = await prisma.courseNftConfig.findUnique({
      where: { courseId },
    });
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "NFT disabled" }, { status: 400 });
    }

    const existing = await prisma.nftMintClaim.findFirst({
      where: { courseId, userId: user.id, status: { not: "MINTED" } },
    });

    const claim =
      existing ??
      (await prisma.nftMintClaim.create({
        data: {
          courseId,
          userId: user.id,
          recipientAddress,
          payerAddress,
          fineLovelace: config.fineLovelace ?? BigInt(0),
          estimatedFeeLovelace: BigInt(2_000_000),
          status: "PAYMENT_PENDING",
        },
      }));

    return NextResponse.json({
      claimId: claim.id,
      fineLovelace: claim.fineLovelace.toString(),
      estimatedFeeLovelace: claim.estimatedFeeLovelace.toString(),
      status: claim.status,
    });
  } catch (error) {
    console.error("NFT prepare error:", error);
    return NextResponse.json({ error: "Failed to prepare claim" }, { status: 500 });
  }
}
