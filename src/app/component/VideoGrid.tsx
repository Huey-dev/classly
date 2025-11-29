'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MuxPlayer from '@mux/mux-player-react';

// Type for video data
interface Author {
  id: string;
  name: string;
  image?: string | null;
}

interface Video {
  id: string;
  title: string;
  muxPlaybackId: string | null;
  author: Author;
}

export default function VideoGrid() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch('/api/videos');
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data: Video[] = await res.json();
        setVideos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  if (loading) {
    return <p className="text-center py-20">Loading videos...</p>;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No videos available yet.</p>
        <Link
          href="/upload"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Upload the First Video
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4 md:py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-10">
      {videos.map((video) => (
        <Link key={video.id} href={`/video/${video.id}`} className="group block">
          <div className="aspect-video bg-black relative rounded-xl overflow-hidden mb-3 shadow-md hover:shadow-xl transition-shadow">
            {video.muxPlaybackId && (
              <MuxPlayer
                playbackId={video.muxPlaybackId}
                streamType="on-demand"
                muted
                thumbnailTime={1}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
          <div className="flex gap-3">
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
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-0.5 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                {video.title}
              </h3>
              <span className="text-sm text-gray-600 hover:text-gray-900 transition-colors block">
                {video.author.name}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
