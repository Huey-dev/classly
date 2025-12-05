import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "../../../../lib/prisma";
import WatchClient from "./watch-client";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";

type Props = { params: Promise<{ id: string }> };

async function getVideo(id: string) {
  const video = await (prisma as any).content.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      course: { select: { id: true, title: true, description: true, userId: true } },
      mediaMetadata: { select: { duration: true } },
      _count: { select: { likes: true } },
    },
  });
  if (!video || !video.muxPlaybackId) return null;

  const followerUsers = await (prisma as any).contentLike.findMany({
    where: { content: { userId: video.userId } },
    select: { userId: true },
    distinct: ["userId"],
  });

  const related = await (prisma as any).content.findMany({
    where: {
      // cast to any to allow optional courseId even if prisma client isn't regenerated
      ...(video.courseId ? ({ courseId: video.courseId } as any) : ({} as any)),
      type: "VIDEO",
      status: "READY",
      muxPlaybackId: { not: null },
    },
    select: {
      id: true,
      title: true,
      muxPlaybackId: true,
      mediaMetadata: { select: { duration: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 8,
  });

  return { video, related, followers: followerUsers.length };
}

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  const data = await getVideo(id);
  if (!data) return notFound();
  const { video, related, followers } = data;
  const user = await getUserFromRequest();

  let enrolled = false;
  if (video.courseId && user) {
    if (video.course?.userId === user.id) {
      enrolled = true;
    } else {
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId: video.courseId, userId: user.id },
      });
      enrolled = !!enrollment;
    }
  }

  return (
    <WatchClient
      video={serializeVideo(video, followers)}
      related={serializeRelated(related)}
      enrolled={enrolled}
    />
  );
}

function serializeVideo(video: any, followerCount: number) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    muxPlaybackId: video.muxPlaybackId,
    muxAssetId: video.muxAssetId,
    createdAt: video.createdAt.toISOString(),
    author: video.author,
    mediaMetadata: video.mediaMetadata ?? null,
    likes: video._count?.likes ?? 0,
    courseId: video.courseId ?? null,
    partNumber: video.partNumber ?? null,
    followerCount,
    courseTitle: video.course?.title ?? null,
  };
}

function serializeRelated(related: any[]) {
  return related.map((r) => ({
    id: r.id,
    title: r.title,
    muxPlaybackId: r.muxPlaybackId,
    duration: r.mediaMetadata?.duration ?? null,
  }));
}
