'use client';

import Image from "next/image";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnailUrl: string;
    creator: string;
    duration?: string; // optional
  };
}

export default function VideoCard({ video }: VideoCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden">
      <div className="relative w-full h-48">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-2">
        <h2 className="text-sm font-semibold line-clamp-2">{video.title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{video.creator}</p>
        {video.duration && (
          <span className="text-xs text-gray-400">{video.duration}</span>
        )}
      </div>
    </div>
  );
}
