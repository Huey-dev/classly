import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      contents: {
        where: { type: "VIDEO" },
        include: { mediaMetadata: { select: { duration: true, size: true, format: true } } },
        orderBy: [{ partNumber: "asc" }, { createdAt: "asc" }],
      },
      _count: { select: { enrollments: true, contents: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = user?.id === course.userId;
  if (!isOwner && course.visibility === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const enrollment = user
    ? await prisma.enrollment.findFirst({
        where: { userId: user.id, courseId: id },
        select: { id: true },
      })
    : null;

  const sectionsMap = new Map<
    string,
    {
      id: string;
      title: string;
      videos: {
        id: string;
        title: string;
        description: string | null;
        duration: number | null;
        muxPlaybackId: string | null;
        videoUrl: string | null;
        partNumber: number | null;
        createdAt: Date;
      }[];
    }
  >();

  course.contents.forEach((video, idx) => {
    const key = (video.accessLevel || "General").trim() || "General";
    if (!sectionsMap.has(key)) {
      sectionsMap.set(key, {
        id: `${key}-${idx}`,
        title: key,
        videos: [],
      });
    }
    const group = sectionsMap.get(key)!;
    group.videos.push({
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.mediaMetadata?.duration ?? null,
      muxPlaybackId: video.muxPlaybackId,
      videoUrl: video.muxPlaybackId ? `https://stream.mux.com/${video.muxPlaybackId}.m3u8` : null,
      partNumber: video.partNumber,
      createdAt: video.createdAt,
    });
  });

  const totalDurationSeconds = course.contents.reduce(
    (sum, item) => sum + (item.mediaMetadata?.duration ?? 0),
    0
  );

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    coverImage: course.coverImage,
    language: course.language,
    priceAda: course.priceAda,
    isPaid: course.isPaid,
    averageRating: course.averageRating,
    updatedAt: course.updatedAt,
    enrollmentCount: course._count.enrollments,
    videoCount: course._count.contents,
    totalDurationSeconds,
    author: course.author,
    enrolled: !!enrollment,
    sections: Array.from(sectionsMap.values()),
  });
}

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
    data: { courseId: null, partNumber: null, accessLevel: null },
  });
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
