export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { getUserFromRequest } from "../../../lib/auth/getUserFromRequest";
import MeContent from "./MeContent";
import ProfileHeader from "./ProfileHeader";

async function getDashboard(userId: string) {
  try {
    const [videosCount, likesReceived, followers, following] = await Promise.all([
      prisma.content.count({ where: { userId, type: "VIDEO" } }),
      prisma.contentLike.count({ where: { content: { userId } } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    const earningsMonth = 12540; // placeholder
    const totalViews = 1500000; // placeholder
    const subscribers = followers;
    const coursesCreated = await prisma.course.count({ where: { userId } });

    return {
      videosCount,
      likesReceived,
      followers,
      following,
      earningsMonth,
      totalViews,
      subscribers,
      coursesCreated,
    };
  } catch (e) {
    console.warn("Dashboard metrics unavailable, falling back:", e);
    return {
      videosCount: 0,
      likesReceived: 0,
      followers: 0,
      following: 0,
      earningsMonth: 0,
      totalViews: 0,
      subscribers: 0,
      coursesCreated: 0,
    };
  }
}

async function getCourses(userId: string) {
  try {
    const courses = await prisma.course.findMany({
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
    });

    return courses.map((course) => {
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
  } catch (e) {
    console.warn("Courses unavailable, falling back:", e);
    return [];
  }
}

export default async function MePage() {
  const user = await getUserFromRequest();
  if (!user) {
    redirect("/signin");
  }

  const dashboard = await getDashboard(user.id);
  const courses = await getCourses(user.id);
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    bannerImage: (user as any).bannerImage ?? null,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="px-4 sm:px-6 pb-8">
          <ProfileHeader
            user={safeUser}
            stats={{
              followers: dashboard.followers,
              following: dashboard.following,
              videos: dashboard.videosCount,
            }}
          />
          <div className="mt-6">
            <MeContent dashboard={dashboard} courses={courses} />
          </div>
        </div>
      </div>
    </div>
  );
}
