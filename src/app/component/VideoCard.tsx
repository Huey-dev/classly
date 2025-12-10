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
    <div className="bg-white dark:bg-gray-800 rounded-sm shadow hover:shadow-lg transition cursor-pointer overflow-hidden w-full max-w-xl mx-auto sm:max-w-full">
      <div className="relative w-full h-56 sm:h-48">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-3 sm:p-[4px]">
        <h2 className="text-sm font-semibold line-clamp-2">{video.title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{video.creator}</p>
        {video.duration && (
          <span className="text-xs text-gray-400">{video.duration}</span>
        )}
      </div>
    </div>
  );
}
