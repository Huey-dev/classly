import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "../../../../lib/prisma";

type Props = { params: Promise<{ id: string }> };

async function getProfile(userId: string) {
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

  const followers = await prisma.follow.count({ where: { followingId: userId } });
  const following = await prisma.follow.count({ where: { followerId: userId } });

  const videos = await prisma.content.findMany({
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
    take: 8,
  });

  return { user, followers, following, videos };
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return notFound();

  return <ProfileClient profile={serialize(profile)} />;
}

function serialize(data: Awaited<ReturnType<typeof getProfile>>) {
  if (!data) return null;
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
    videos: data.videos.map((v) => ({
      id: v.id,
      title: v.title,
      muxPlaybackId: v.muxPlaybackId,
      duration: v.mediaMetadata?.duration ?? null,
      createdAt: v.createdAt.toISOString(),
      likes: v._count.likes,
    })),
  };
}

// Client shell (hydration-safe) — replace with a proper client component if you need interactivity
function ProfileClient({ profile }: { profile: ReturnType<typeof serialize> }) {
  if (!profile) return null;
  const { user, followers, following, videos } = profile;
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Banner */}
        <div className="h-40 sm:h-48 bg-gradient-to-r from-purple-500 to-blue-500 rounded-b-3xl relative">
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
            <div>
              <h1 className="text-2xl font-bold">{user.name || "Unnamed User"}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fashion Designer</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                <span>{followers} Followers</span>
                <span>{following} Following</span>
                <span>{user.videosCount} Videos</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:shadow">
                Message
              </button>
              <button className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700">
                Follow
              </button>
            </div>
          </div>

          {/* Tabs (static) */}
          <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <span className="text-blue-600">Videos</span>
            <span>Courses</span>
            <span>NFTs</span>
            <span>About</span>
          </div>

          {/* Video grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <Link
                key={v.id}
                href={`/video/${v.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow hover:shadow-md transition"
              >
                <div className="relative aspect-video bg-black">
                  {v.muxPlaybackId ? (
                    <img
                      src={`https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?time=1`}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">No thumb</div>
                  )}
                  <div className="absolute bottom-2 right-2 text-xs text-white bg-black/70 px-2 py-1 rounded">
                    {formatDuration(v.duration)}
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-sm font-semibold line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatLikes(v.likes)} likes · {formatTimeSince(v.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatLikes(count: number) {
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(count >= 100_000 ? 0 : 1)}K`;
  if (count < 1_000_000_000) return `${(count / 1_000_000).toFixed(count >= 100_000_000 ? 0 : 1)}M`;
  return `${(count / 1_000_000_000).toFixed(1)}B`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return "--:--";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = `${m}`.padStart(2, "0");
  const ss = `${s}`.padStart(2, "0");
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

function formatTimeSince(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const diff = Math.max(0, now.getTime() - then.getTime());

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes || 1}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
