import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

type Params = { params: Promise<{ courseId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action === "refund" ? "refund" : "release";

  const escrow = await prisma.escrow.findFirst({ where: { courseId } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  const data: Record<string, any> = {};
  if (action === "release") {
    data.status = "RELEASED";
    data.releasedFinal = true;
  } else {
    data.status = "REFUNDED";
  }

  const updated = await prisma.escrow.update({
    where: { id: escrow.id },
    data,
  });

  return NextResponse.json({ status: updated.status, releasedFinal: updated.releasedFinal ?? false });
}
