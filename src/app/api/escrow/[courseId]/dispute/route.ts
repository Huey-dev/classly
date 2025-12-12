import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

type Params = { params: Promise<{ courseId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

  const escrow = await prisma.escrow.findFirst({ where: { courseId } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  const updated = await prisma.escrow.update({
    where: { id: escrow.id },
    data: {
      status: "DISPUTED",
      comments: reason ? escrow.comments + 1 : escrow.comments,
    } as any,
  });

  return NextResponse.json({ status: updated.status, reason });
}
