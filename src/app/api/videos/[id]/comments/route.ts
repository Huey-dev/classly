import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;
  const comments = await prisma.contentReview.findMany({
    where: { contentId, comment: { not: null } },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    comments.map((c) => ({
      id: c.id,
      text: c.comment,
      author: c.user.name || "User",
      authorId: c.userId,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Comment required" }, { status: 400 });
  }

  const { id: contentId } = await params;

  // Upsert on unique (userId, contentId) constraint
  const comment = await prisma.contentReview.upsert({
    where: { userId_contentId: { userId: user.id, contentId } },
    update: { comment: text.trim(), rating: 0 },
    create: { userId: user.id, contentId, comment: text.trim(), rating: 0 },
  });

  return NextResponse.json({
    id: comment.id,
    text: comment.comment,
    author: user.name || "You",
    authorId: user.id,
    createdAt: comment.createdAt.toISOString(),
  });
}
