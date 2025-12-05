import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;
  const [likes, dislikes] = await Promise.all([
    prisma.contentLike.count({ where: { contentId } }),
    prisma.contentReview.count({ where: { contentId, rating: { lt: 0 } } }),
  ]);
  return NextResponse.json({ likes, dislikes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await req.json();

  if (action === "like") {
    await prisma.contentLike.upsert({
      where: { userId_contentId: { userId: user.id, contentId } },
      update: {},
      create: { userId: user.id, contentId },
    });
    // Remove dislike if exists
    await prisma.contentReview.deleteMany({
      where: { userId: user.id, contentId, rating: { lt: 0 } },
    });
  } else if (action === "unlike") {
    await prisma.contentLike.deleteMany({
      where: { userId: user.id, contentId },
    });
  } else if (action === "dislike") {
    await prisma.contentReview.upsert({
      where: { userId_contentId: { userId: user.id, contentId } },
      update: { rating: -1, comment: null },
      create: { userId: user.id, contentId, rating: -1, comment: null },
    });
    // Remove like if exists
    await prisma.contentLike.deleteMany({
      where: { userId: user.id, contentId },
    });
  } else if (action === "undislike") {
    await prisma.contentReview.deleteMany({
      where: { userId: user.id, contentId, rating: { lt: 0 } },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const [likes, dislikes] = await Promise.all([
    prisma.contentLike.count({ where: { contentId } }),
    prisma.contentReview.count({ where: { contentId, rating: { lt: 0 } } }),
  ]);

  return NextResponse.json({
    likes,
    dislikes,
    liked: action === "like" ? true : action === "unlike" ? false : undefined,
    disliked: action === "dislike" ? true : action === "undislike" ? false : undefined,
  });
}
