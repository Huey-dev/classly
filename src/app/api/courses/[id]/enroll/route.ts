import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ enrolled: false });
  }
  const { id: courseId } = await params;
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
  });
  return NextResponse.json({ enrolled: !!enrollment });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: courseId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findFirst({
    where: { courseId, userId: user.id },
  });

  if (!existing) {
    await prisma.enrollment.create({
      data: { courseId, userId: user.id },
    });
  }

  return NextResponse.json({ enrolled: true });
}
