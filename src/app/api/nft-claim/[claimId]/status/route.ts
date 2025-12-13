import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/nft-claim/[claimId]/status
 *
 * Poll minting status for a claim.
 * App Router–compliant (Next.js 16)
 */

type Context = {
  params: Promise<{
    claimId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: Context
) {
  const { claimId } = await context.params;

  const claim = await prisma.nftMintClaim.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    return NextResponse.json(
      { error: "Claim not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    claimId: claim.id,
    status: claim.status,
    txHash: claim.txHash,
    assetId: claim.assetId,
    policyId: claim.policyId,
    assetName: claim.assetName,
    errorCode: claim.errorCode,
    errorMessage: claim.errorMessage,
  });
}
