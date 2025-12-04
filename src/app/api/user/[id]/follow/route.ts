import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params;
  const followers = await prisma.follow.count({ where: { followingId: targetId } });
  const following = await prisma.follow.count({ where: { followerId: targetId } });
  return NextResponse.json({ followers, following });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;
  if (targetId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { action } = await req.json();

  if (action === "follow") {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
      update: {},
      create: { followerId: user.id, followingId: targetId },
    });
  } else if (action === "unfollow") {
    await prisma.follow.deleteMany({
      where: { followerId: user.id, followingId: targetId },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const followers = await prisma.follow.count({ where: { followingId: targetId } });
  const following = await prisma.follow.count({ where: { followerId: targetId } });

  return NextResponse.json({
    followers,
    following,
    followingTarget: action === "follow",
  });
}
