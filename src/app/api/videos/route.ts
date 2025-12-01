import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import Mux from '@mux/mux-node';
import { prisma } from '../../../../lib/prisma';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function GET() {
  try {
    const videos = await prisma.content.findMany({
      where: {
        type: 'VIDEO',
        status: 'READY',
        muxPlaybackId: { not: null }, // Only show valid Mux videos
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true } },
        mediaMetadata: { select: { duration: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      // createdAt is included by default; kept here to emphasize dependency for time-since upload
    });

    // Best-effort fill missing durations from Mux if tokens are present
    const enriched = await Promise.all(
      videos.map(async (video) => {
        if (video.mediaMetadata?.duration !== null && video.mediaMetadata?.duration !== undefined) {
          return video;
        }
        if (!video.muxAssetId || !process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
          return video;
        }
        try {
          const asset = await mux.video.assets.retrieve(video.muxAssetId);
          const duration = asset?.duration ? Math.round(asset.duration) : null;
          const format =
            (asset as any)?.container ||
            (asset as any)?.master?.type ||
            'unknown';
          if (duration !== null) {
            await prisma.mediaMetadata.upsert({
              where: { contentId: video.id },
              update: { duration, format },
              create: { contentId: video.id, duration, size: 0, format },
            });
            return { ...video, mediaMetadata: { duration } };
          }
        } catch (e) {
          console.warn('Could not fetch duration from Mux for asset', video.muxAssetId, e);
        }
        return video;
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001') {
      console.error('Database unreachable for /api/videos:', err.message);
      // Return an empty array so the UI can still render; surface a clear message
      return NextResponse.json(
        { error: 'Database unreachable. Check DATABASE_URL/DIRECT_URL or start your DB.' },
        { status: 503 }
      );
    }
    console.error('Failed to fetch videos:', err);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
