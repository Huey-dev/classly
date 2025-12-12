import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contents: true, enrollments: true } },
    },
  });

  return NextResponse.json(
    courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      visibility: course.visibility,
      slug: course.slug,
      language: course.language,
      createdAt: course.createdAt,
      contentCount: course._count.contents,
      enrollmentCount: course._count.enrollments,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, coverImage, category, priceAda, walletAddress } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const baseSlug = slugify(title);
  const uniqueSlug = `${baseSlug || "course"}-${Date.now()}`;

  let normalizedPrice: number | null = null;
  let isPaid = false;
  if (priceAda !== undefined && priceAda !== null) {
    const ada = Number(priceAda);
    if (!Number.isFinite(ada) || ada < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    normalizedPrice = ada;
    isPaid = ada > 0;
  }

  // If creator provided a wallet, persist it on their profile once.
  if (typeof walletAddress === "string" && walletAddress.trim()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { walletAddress: walletAddress.trim() },
    });
    user.walletAddress = walletAddress.trim();
  }

  // For paid courses, require the author to have a wallet set.
  if (isPaid && (!user.walletAddress || !user.walletAddress.trim())) {
    return NextResponse.json(
      { error: "Set your payout wallet address before creating a paid course." },
      { status: 400 }
    );
  }

  const course = await prisma.course.create({
    data: {
      title,
      description: description || null,
      coverImage: coverImage || null,
      userId: user.id,
      slug: uniqueSlug,
      visibility: "DRAFT",
      language: typeof category === "string" ? category : null,
      priceAda: normalizedPrice,
      isPaid,
    },
  });

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    coverImage: course.coverImage,
    slug: course.slug,
    language: course.language,
    priceAda: course.priceAda,
    isPaid: course.isPaid,
  });
}
