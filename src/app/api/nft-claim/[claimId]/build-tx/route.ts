import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

type Params = {
  params: Promise<{ claimId: string }>;
};

/**
 * POST /api/nft-claim/[claimId]/build-tx
 *
 * Builds an unsigned transaction for NFT minting.
 * Auth is unified via getUserFromRequest().
 */
export async function POST(
  _req: Request,
  { params }: Params
) {
  try {
    const { claimId } = await params;

    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claim = await prisma.nftMintClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim || claim.userId !== user.id) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (claim.status !== "PAYMENT_PENDING") {
      return NextResponse.json(
        { error: "Claim not in payable state" },
        { status: 400 }
      );
    }

    /**
     * ⚠️ Placeholder:
     * Replace this with Lucid transaction builder logic.
     * This route MUST remain server-safe.
     */
    const unsignedTxCbor = "CBOR_PLACEHOLDER";

    return NextResponse.json({
      claimId,
      unsignedTxCbor,
    });
  } catch (error) {
    console.error("build-tx error:", error);
    return NextResponse.json(
      { error: "Failed to build transaction" },
      { status: 500 }
    );
  }
}
