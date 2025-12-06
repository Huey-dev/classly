import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";
import CourseClient from "./CourseClient";

type Props = { params: Promise<{ id: string }> };

async function getCourse(id: string) {
  const course = await (prisma as any).course.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
      contents: {
        where: { type: "VIDEO", muxPlaybackId: { not: null } },
        select: {
          id: true,
          title: true,
          muxPlaybackId: true,
          partNumber: true,
          createdAt: true,
          description: true,
          mediaMetadata: { select: { duration: true } },
        },
        orderBy: [{ partNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!course) return null;

  const enrollmentCount = await prisma.enrollment.count({ where: { courseId: id } });

  return { course, enrollmentCount };
}

export default async function CoursePage({ params }: Props) {
  const { id } = await params;
  const data = await getCourse(id);
  if (!data) return notFound();

  const user = await getUserFromRequest();
  const { course, enrollmentCount } = data;

  let enrolled = false;
  const isOwner = !!user && user.id === course.userId;
  if (user) {
    if (isOwner) {
      enrolled = true;
    } else {
      const row = await prisma.enrollment.findFirst({ where: { courseId: id, userId: user.id } });
      enrolled = !!row;
    }
  }

  return (
    <CourseClient
      courseId={course.id}
      title={course.title}
      description={course.description}
      coverImage={course.coverImage}
      priceAda={course.priceAda ? Number(course.priceAda) : null}
      isPaid={course.isPaid}
      averageRating={course.averageRating ?? null}
      updatedAt={course.updatedAt?.toISOString?.() ?? new Date().toISOString()}
      author={course.author}
      totalDurationSeconds={course.totalDuration ? Number(course.totalDuration) : undefined}
      videos={course.contents.map((c: any) => ({
        id: c.id,
        title: c.title,
        muxPlaybackId: c.muxPlaybackId,
        duration: c.mediaMetadata?.duration ?? null,
        partNumber: c.partNumber,
        createdAt: c.createdAt.toISOString(),
        description: c.description,
      }))}
      enrolled={enrolled}
      isOwner={isOwner}
      isTeacher={user?.role === "TEACHER"}
      enrollmentCount={enrollmentCount}
    />
  );
}
