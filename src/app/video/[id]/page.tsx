import { prisma } from '../../../../lib/prisma';
import Image from 'next/image';
import MuxPlayer from '@mux/mux-player-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// Define the shape of the parameters object expected by this page component
interface WatchPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Next.js 15 - params is now a Promise
export default async function WatchPage({ params }: WatchPageProps) {
  const { id: videoId } = await params;

  // Add error handling for database connection
  let video;
  try {
    video = await prisma.content.findUnique({
      where: { id: videoId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Failed to fetch video');
  }

  if (!video || video.type !== 'VIDEO' || video.status !== 'READY' || !video.muxPlaybackId) {
    return notFound();
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="logo" width={37} height={37} />
              <h1 className="text-xl font-bold">classly</h1>
            </Link>
          </div>
          <Link
            href="/upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Upload
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-6">
              <MuxPlayer
                playbackId={video.muxPlaybackId}
                streamType="on-demand"
                autoPlay
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <h1 className="text-2xl font-bold mb-3">{video.title}</h1>
            
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-4">
                {video.author.image ? (
                  <img
                    src={video.author.image}
                    alt={video.author.name || 'User'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-semibold">
                    {video.author.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold">{video.author.name}</h2>
                  <p className="text-sm text-gray-600">Published on {formatDate(video.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{video.description}</p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Related Videos</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 rounded-lg text-gray-600">
                No related videos logic implemented yet.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}