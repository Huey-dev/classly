import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const body = await req.json().catch(() => ({}));
  const recipientAddress = (body.recipientAddress || user.walletAddress || "").trim();
  const payerAddress = (body.payerAddress || recipientAddress).trim();
  const fineLovelace = Number(body.fineLovelace ?? 0);

  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  if (!recipientAddress) return NextResponse.json({ error: "Recipient address required" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, nftConfig: { select: { enabled: true, fineLovelace: true, eligibilityRule: true } } },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.nftConfig?.enabled) return NextResponse.json({ error: "NFT claims disabled for this course" }, { status: 403 });

  const enrolled = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
    select: { id: true },
  });
  if (!enrolled) return NextResponse.json({ error: "Enroll to claim certificate" }, { status: 403 });

  const claim = await prisma.nftMintClaim.upsert({
    where: { courseId_userId_idempotencyKey: { courseId, userId: user.id, idempotencyKey: "default" } },
    create: {
      courseId,
      userId: user.id,
      recipientAddress,
      payerAddress: payerAddress || recipientAddress,
      fineLovelace: BigInt(fineLovelace || course.nftConfig.fineLovelace || 0),
      status: "LOCKED",
      idempotencyKey: "default",
    },
    update: {
      recipientAddress,
      payerAddress: payerAddress || recipientAddress,
      fineLovelace: BigInt(fineLovelace || course.nftConfig.fineLovelace || 0),
      status: "LOCKED",
      errorCode: null,
      errorMessage: null,
    },
    select: {
      id: true,
      status: true,
      recipientAddress: true,
      payerAddress: true,
      fineLovelace: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ claim });
}
