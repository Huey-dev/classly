'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Heart, UserPlus, UserCheck } from "../component/icons/index";
import Skeleton from './VideoGridSkeleton';

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
  createdAt: string;
  _count?: { likes: number };
  mediaMetadata?: { duration?: number | null };
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
    return <Skeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-md">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">No videos available yet.</p>
          <a
            href="/upload"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Upload the First Video
          </a>
        </div>
      </div>
    );
  }

  // Take only first 9 videos for 3x3 grid
  const displayVideos = videos.slice(0, 9);

  return (
    <div className="bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Fixed 3x3 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {displayVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>

        {videos.length > 9 && (
          <div className="mt-10 text-center">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg">
              Load More Videos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: Video }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<string[]>([]);

  const thumbnail = video.muxPlaybackId
    ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?time=1`
    : null;
  const durationSeconds = video.mediaMetadata?.duration ?? null;
  const durationLabel = formatDuration(durationSeconds);
  
  // Real-time like count from API data
  const likeCount = video._count?.likes ?? 0;

  const toggleFollow = () => {
    setIsFollowing((prev) => !prev);
  };

  const toggleComments = async () => {
    setShowComments((prev) => !prev);
    if (!showComments) {
      try {
        const res = await fetch(`/api/videos/${video.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          const texts = (data as any[]).map((c) => c.text as string).filter(Boolean);
          setComments(texts);
        }
      } catch (e) {
        console.error("Failed to load comments", e);
      }
    }
  };

  // Get author initials
  const authorInitials = video.author.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="group rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transform hover:-translate-y-1 max-w-[540px] w-full">
      {/* Video Thumbnail */}
      <a href={`/video/${video.id}`} className="block relative aspect-[16/8.5] overflow-hidden bg-black">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-20">🎬</div>
          </div>
        )}
        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/90 backdrop-blur-sm text-white text-xs font-bold shadow-lg">
          {durationLabel}
        </div>
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </a>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Avatar & Follow Button Section */}
        <div className="flex gap-3 mb-2.5 items-start">
          {/* Author Avatar */}
          {video.author.image ? (
            <img
              src={video.author.image}
              alt={video.author.name || 'User'}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-blue-100 dark:ring-blue-900"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-100 dark:ring-blue-900';
                  fallback.textContent = authorInitials;
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-100 dark:ring-blue-900">
              {authorInitials}
            </div>
          )}

          {/* Title & Info */}
          <div className="flex-1 min-w-0">
            <a href={`/video/${video.id}`} className="block">
              <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {video.title}
              </h3>
            </a>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
              {video.author.name}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{formatLikes(likeCount)} {likeCount === 1 ? 'like' : 'likes'}</span>
              <span>•</span>
              <span>{formatTimeSince(video.createdAt)}</span>
            </div>
          </div>

          {/* Follow Button */}
          <button
            onClick={toggleFollow}
            className={`h-9 px-3 rounded-full transition-all transform hover:scale-105 flex items-center gap-1.5 flex-shrink-0 ${
              isFollowing
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
            }`}
            aria-label={isFollowing ? 'Unfollow' : 'Follow'}
          >
            {isFollowing ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Comments Dropdown Toggle */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={toggleComments}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm transition-all"
          >
            <span>Comments {comments.length > 0 && `(${comments.length})`}</span>
            {showComments ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Comments Dropdown */}
        {showComments && (
          <div className="pt-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
            {/* Comments List */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3 italic">
                  No comments yet.
                </p>
              ) : (
                comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-600"
                  >
                    {comment}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
