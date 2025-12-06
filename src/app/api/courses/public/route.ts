import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { visibility: { in: ["PUBLISHED", "UNLISTED"] } },
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { enrollments: true, contents: true } },
      contents: { where: { type: "VIDEO" }, select: { mediaMetadata: { select: { duration: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(
    courses.map((course) => {
      const totalDurationSeconds = course.contents.reduce((sum, c) => sum + (c.mediaMetadata?.duration ?? 0), 0);
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        coverImage: course.coverImage,
        priceAda: course.priceAda,
        averageRating: course.averageRating,
        enrollmentCount: course._count.enrollments,
        videoCount: course._count.contents,
        durationWeeks: course.totalDuration
          ? Math.max(1, Math.ceil(Number(course.totalDuration) / (60 * 60 * 5)))
          : Math.max(1, Math.ceil(totalDurationSeconds / (60 * 60 * 5))),
        author: course.author,
      };
    })
  );
}
