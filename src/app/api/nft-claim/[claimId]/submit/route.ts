import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

/**
 * POST /api/nft-claim/[claimId]/submit
 *
 * Finalizes an NFT mint after the wallet submits a transaction.
 * App Router–compliant (Next.js 16).
 */

type Context = {
  params: Promise<{
    claimId: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  context: Context
) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await context.params;
    const body = await _request.json();

    const txHash = body?.txHash as string | undefined;
    const policyId = body?.policyId as string | undefined;
    const assetName = body?.assetName as string | undefined;

    if (!txHash || !policyId || !assetName) {
      return NextResponse.json(
        { error: "txHash, policyId and assetName are required" },
        { status: 400 }
      );
    }

    const claim = await prisma.nftMintClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim || claim.userId !== user.id) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (claim.status === "MINTED") {
      return NextResponse.json({
        claimId,
        status: claim.status,
        assetId: claim.assetId,
        txHash: claim.txHash,
      });
    }

    const assetId = `${policyId}${assetName}`;

    const updated = await prisma.nftMintClaim.update({
      where: { id: claimId },
      data: {
        status: "MINTED",
        txHash,
        policyId,
        assetName,
        assetId,
      },
    });

    return NextResponse.json({
      claimId,
      status: updated.status,
      assetId: updated.assetId,
      txHash: updated.txHash,
    });
  } catch (error) {
    console.error("NFT submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit tx" },
      { status: 500 }
    );
  }
}
