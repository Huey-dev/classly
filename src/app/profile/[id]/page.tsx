import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import ProfileClient from "./ProfileClient";

type Props = { params: Promise<{ id: string }> };

async function getProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        _count: { select: { contents: true } },
      },
    });
    if (!user) return null;

    const [followers, following, likesReceived, videos, courses] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.contentLike.count({ where: { content: { userId } } }),
      prisma.content.findMany({
        where: { userId, type: "VIDEO", status: "READY", muxPlaybackId: { not: null } },
        select: {
          id: true,
          title: true,
          muxPlaybackId: true,
          mediaMetadata: { select: { duration: true } },
          createdAt: true,
          _count: { select: { likes: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.course.findMany({
        where: { userId },
        include: {
          author: { select: { id: true, name: true, image: true } },
          contents: {
            where: { type: "VIDEO" },
            select: { id: true, _count: { select: { likes: true } }, mediaMetadata: { select: { duration: true } } },
          },
          _count: { select: { enrollments: true, contents: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { user, followers, following, likesReceived, videos, courses };
  } catch (e) {
    console.warn("Profile fetch failed, falling back:", e);
    return {
      user: {
        id: userId,
        name: "Profile unavailable",
        image: null,
        role: "USER",
        createdAt: new Date(),
        _count: { contents: 0 },
      },
      followers: 0,
      following: 0,
      likesReceived: 0,
      videos: [],
      courses: [],
    };
  }
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return notFound();

  return <ProfileClient profile={serialize(profile)} />;
}

function serialize(data: Awaited<ReturnType<typeof getProfile>>) {
  if (!data) return null;
  const courses = data.courses.map((course) => {
    const totalDurationSeconds = course.contents.reduce((sum, c) => sum + (c.mediaMetadata?.duration ?? 0), 0);
    const totalDuration = course.totalDuration ? Number(course.totalDuration) : null;
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      enrollmentCount: course._count.enrollments,
      likes: course.contents.reduce((sum, c) => sum + (c._count?.likes ?? 0), 0),
      rating: course.averageRating ?? null,
      videoCount: course._count.contents,
      durationWeeks: totalDuration
        ? Math.max(1, Math.ceil(totalDuration / (60 * 60 * 5)))
        : Math.max(1, Math.ceil(totalDurationSeconds / (60 * 60 * 5))),
      coverImage: course.coverImage || null,
      author: course.author,
    };
  });

  return {
    user: {
      id: data.user.id,
      name: data.user.name,
      image: data.user.image,
      role: data.user.role,
      joined: data.user.createdAt.toISOString(),
      videosCount: data.user._count.contents,
    },
    followers: data.followers,
    following: data.following,
    likesReceived: data.likesReceived,
    videos: data.videos.map((v) => ({
      id: v.id,
      title: v.title,
      muxPlaybackId: v.muxPlaybackId,
      duration: v.mediaMetadata?.duration ?? null,
      createdAt: v.createdAt.toISOString(),
      likes: v._count.likes,
    })),
    courses,
  };
}
