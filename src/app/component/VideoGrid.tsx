// app/components/VideoGrid.tsx
import { prisma } from '../../../lib/prisma';
import Link from 'next/link';
import MuxPlayer from '@mux/mux-player-react';

// The VideoGrid component is an async Server Component.
export default async function VideoGrid() {
  const videos = await prisma.content.findMany({
    where: {
      type: 'VIDEO',
      status: 'READY',
      muxPlaybackId: { not: null },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  return (
    <>
      {videos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No videos available yet.</p>
          <Link
            href="/upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Upload the First Video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-8">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </>
  );
}

// Video Card Component for consistency
function VideoCard({ video }: { video: any }) {
  return (
    <div className="group">
      <Link href={`/video/${video.id}`} className="block">
        {/* Thumbnail */}
        <div className="aspect-video bg-black dark:bg-gray-800 relative rounded-xl overflow-hidden mb-3 shadow-md hover:shadow-xl transition-shadow">
          {video.muxPlaybackId && (
            <MuxPlayer
              playbackId={video.muxPlaybackId}
              streamType="on-demand"
              muted
              thumbnailTime={1}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex gap-3">
          {/* Author Avatar */}
          {video.author.image ? (
            <img
              src={video.author.image}
              alt={video.author.name || 'User'}
              className="w-9 h-9 rounded-full object-cover mt-1 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mt-1 flex-shrink-0 flex items-center justify-center text-white text-base font-semibold">
              {video.author.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}

          {/* Text Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 line-clamp-2 leading-snug text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {video.title}
            </h3>

            {/* Author Name with verification */}
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {video.author.name}
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">✓</span>
            </div>

            {/* Views and time */}
            <span className="text-xs text-gray-500 dark:text-gray-500 block">
              1.2K views • 2 days ago
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md font-medium transition-colors">
                $ Monetized
              </button>
              <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium transition-colors">
                Free Preview
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}