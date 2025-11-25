import { prisma } from '../../../lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import MuxPlayer from '@mux/mux-player-react';

// The VideoGrid component is an async Server Component.
// It fetches the data it needs independently.
export default async function VideoGrid() {
  // Fetch all ready videos
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
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4 md:py-8">
      {videos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No videos available yet.</p>
          <Link
            href="/upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Upload the First Video
          </Link>
        </div>
      ) : (
        /* YouTube-style Responsive Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-10">
          {videos.map((video) => (
            <Link
              key={video.id}
              // The link correctly points to the dynamic watch route
              href={`/watch/${video.id}`}
              className="group block"
            >
              <div className="w-full">
                {/* Thumbnail */}
                <div className="aspect-video bg-black relative rounded-xl overflow-hidden mb-3 shadow-md hover:shadow-xl transition-shadow">
                  {video.muxPlaybackId && (
                    <MuxPlayer
                      playbackId={video.muxPlaybackId}
                      streamType="on-demand"
                      muted
                      // Use the thumbnail image as a poster, or let Mux handle it
                      thumbnailTime={1} 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </div>

                {/* Info - Re-structured for the standard thumbnail/channel avatar layout */}
                <div className="flex gap-3">
                  {/* Author Avatar */}
                  {video.author.image ? (
                    <img
                      src={video.author.image}
                      alt={video.author.name || 'User'}
                      className="w-9 h-9 rounded-full object-cover mt-1 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-400 mt-1 flex-shrink-0 flex items-center justify-center text-white text-base font-semibold">
                      {video.author.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-0.5 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {video.title}
                    </h3>

                    {/* Author Name */}
                    <span className="text-sm text-gray-600 hover:text-gray-900 transition-colors block">
                      {video.author.name}
                    </span>

                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}