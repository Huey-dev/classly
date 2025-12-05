import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contents: true, enrollments: true } },
    },
  });

  return NextResponse.json(
    courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      visibility: course.visibility,
      slug: course.slug,
      createdAt: course.createdAt,
      contentCount: course._count.contents,
      enrollmentCount: course._count.enrollments,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, coverImage } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const baseSlug = slugify(title);
  const uniqueSlug = `${baseSlug || "course"}-${Date.now()}`;

  const course = await prisma.course.create({
    data: {
      title,
      description: description || null,
      coverImage: coverImage || null,
      userId: user.id,
      slug: uniqueSlug,
      visibility: "DRAFT",
    },
  });

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    coverImage: course.coverImage,
    slug: course.slug,
  });
}
