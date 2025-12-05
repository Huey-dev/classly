import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, description, coverImage, priceAda } = await req.json();
  const data: any = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof description === "string") data.description = description.trim() || null;
  if (typeof coverImage === "string") data.coverImage = coverImage.trim() || null;
  if (priceAda !== undefined) {
    if (user.role !== "TEACHER") {
      return NextResponse.json({ error: "Only verified teachers can set price" }, { status: 403 });
    }
    const ada = Number(priceAda);
    if (!Number.isFinite(ada) || ada < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    data.priceAda = ada;
    data.isPaid = ada > 0;
  }

  const updated = await prisma.course.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      priceAda: true,
      isPaid: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { userId: true } });
  if (!course || course.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Detach videos first to avoid foreign key issues
  await prisma.content.updateMany({
    where: { courseId: id },
    data: { courseId: null, partNumber: null },
  });
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
