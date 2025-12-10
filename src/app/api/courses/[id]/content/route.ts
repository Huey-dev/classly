import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const { contentId, partNumber, sectionTitle } = await req.json();

  if (!contentId) {
    return NextResponse.json({ error: "contentId is required" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.userId !== user.id) {
    return NextResponse.json({ error: "Course not found or not yours" }, { status: 404 });
  }

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content || content.userId !== user.id || content.type !== "VIDEO") {
    return NextResponse.json({ error: "Video not found or not yours" }, { status: 404 });
  }

  const updated = await prisma.content.update({
    where: { id: contentId },
    data: {
      courseId,
      accessLevel: typeof sectionTitle === "string" ? sectionTitle.trim() || null : content.accessLevel,
      partNumber: typeof partNumber === "number" ? partNumber : content.partNumber,
    },
    select: { id: true, courseId: true, partNumber: true, title: true },
  });

  return NextResponse.json(updated);
}
