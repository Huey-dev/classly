import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../../lib/auth/getUserFromRequest";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contentId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: courseId, contentId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { userId: true } });
  if (!course || course.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.content.update({
    where: { id: contentId },
    data: { courseId: null, partNumber: null },
  });

  return NextResponse.json({ success: true });
}
