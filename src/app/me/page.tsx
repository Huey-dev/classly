import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "../../../lib/prisma";
import { getUserFromRequest } from "../../../lib/auth/getUserFromRequest";

async function getDashboard(userId: string) {
  const [videosCount, likesReceived, followers, following] = await Promise.all([
    prisma.content.count({ where: { userId, type: "VIDEO" } }),
    prisma.contentLike.count({ where: { content: { userId } } }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  // Placeholder earnings; replace with real payment data when available
  const earningsMonth = 12540;
  const totalViews = 1500000;
  const subscribers = followers;
  const coursesCreated = await prisma.content.count({
    where: { userId, courseId: { not: null } },
  });

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
}

export default async function MePage() {
  const user = await getUserFromRequest();
  if (!user) {
    redirect("/signin");
  }

  const dashboard = await getDashboard(user.id);

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
            </div>
          </div>

          {/* Dashboard Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Creator Dashboard Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-200">
                <SummaryTile label="Earning (Month)" value={`$${dashboard.earningsMonth.toLocaleString()}`} />
                <SummaryTile label="Total Views" value={dashboard.totalViews.toLocaleString()} />
                <SummaryTile label="Subscribers" value={dashboard.subscribers.toLocaleString()} />
                <SummaryTile label="Courses Created" value={dashboard.coursesCreated} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/upload" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
                  Upload
                </Link>
                <button className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                  Go Live
                </button>
                <button className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 hover:shadow">
                  View Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Tabs placeholder */}
          <div className="mt-6 flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <span className="text-blue-600">Videos</span>
            <span>Courses</span>
            <span>NFTs</span>
            <span>About</span>
          </div>

          {/* Videos preview */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboard.videosCount === 0 ? (
              <div className="col-span-full text-sm text-gray-500 dark:text-gray-400">
                You haven&apos;t uploaded any videos yet.
              </div>
            ) : (
              // This would normally fetch the user's videos; showing placeholder summary only
              <div className="col-span-full text-sm text-gray-500 dark:text-gray-400">
                Your recent videos will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
