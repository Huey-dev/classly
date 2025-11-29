import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

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
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(videos);
  } catch (err) {
    console.error('Failed to fetch videos:', err);
    return NextResponse.json([], { status: 500 });
  }
}
