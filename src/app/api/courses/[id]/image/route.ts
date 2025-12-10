import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP are allowed" }, { status: 400 });
  }

  const sizeLimit = 5 * 1024 * 1024;
  if (file.size > sizeLimit) {
    return NextResponse.json({ error: "Image exceeds 5MB limit" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".png";
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "courses");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${id}-${Date.now()}${ext}`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  const publicPath = `/uploads/courses/${filename}`;
  await prisma.course.update({
    where: { id },
    data: { coverImage: publicPath },
  });

  return NextResponse.json({ coverImage: publicPath });
}
