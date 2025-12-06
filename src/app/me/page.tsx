export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "../../../lib/prisma";
import { getUserFromRequest } from "../../../lib/auth/getUserFromRequest";
import SettingsMenu from "./SettingsMenu";
import MeContent from "./MeContent";

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Banner */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-purple-500 to-blue-500 rounded-b-3xl relative">
          <div className="absolute bottom-0 left-4 sm:left-6 translate-y-1/2">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden shadow-lg">
              {user.image ? (
                <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-14 gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">{user.name || "Your Profile"}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Creator Dashboard</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-1">
                <span>{dashboard.followers} Followers</span>
                <span>{dashboard.following} Following</span>
                <span>{dashboard.videosCount} Videos</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:shadow">
                Edit Profile
              </button>
              <Link
                href="/upload"
                className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Upload
              </Link>
              <SettingsMenu />
            </div>
          </div>
          <div className="mt-6">
            <MeContent dashboard={dashboard} courses={courses} />
          </div>
        </div>
      </div>
    </div>
  );
}
