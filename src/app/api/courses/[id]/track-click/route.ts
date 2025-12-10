import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

type Params = { params: Promise<{ id: string }> };

const CLICK_DEDUP_WINDOW_MINUTES = 10;

function sanitizeRef(ref: unknown) {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (!trimmed || trimmed.length > 100) return null;
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) return null;
  return trimmed;
}

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // NextRequest.ip is available on Vercel / edge
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return (req as any).ip || null;
}

function hashIp(ip: string, userAgent: string) {
  return crypto.createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");
}

function computeConversion(totalClicks: number, totalEnrollments: number) {
  if (!totalClicks || totalClicks <= 0) return 0;
  return Number(((totalEnrollments / totalClicks) * 100).toFixed(2));
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: courseId } = await params;
  const body = await req.json().catch(() => ({}));
  const refParam = body.ref ?? req.nextUrl.searchParams.get("ref");
  const refInstructorId = sanitizeRef(refParam);

  if (!refInstructorId) {
    return NextResponse.json({ error: "Missing or invalid ref" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (course.userId !== refInstructorId) {
    return NextResponse.json({ error: "Invalid instructor for course" }, { status: 400 });
  }

  const user = await getUserFromRequest();
  const userAgent = req.headers.get("user-agent") || "unknown";
  const ip = getClientIp(req);
  const ipHash = ip ? hashIp(ip, userAgent) : null;
  const dedupeWindow = new Date(Date.now() - CLICK_DEDUP_WINDOW_MINUTES * 60 * 1000);

  let countedClick = true;
  if (ipHash) {
    const recent = await prisma.courseShareClick.findFirst({
      where: {
        courseId,
        instructorId: refInstructorId,
        ipHash,
        createdAt: { gte: dedupeWindow },
      },
      select: { id: true },
    });
    if (recent) countedClick = false;
  }

  if (countedClick) {
    await prisma.courseShareClick.create({
      data: {
        courseId,
        instructorId: refInstructorId,
        ipHash,
        userAgent: userAgent.slice(0, 500),
      },
    });
  }

  let stats = await prisma.courseShareStats.upsert({
    where: { courseId_instructorId: { courseId, instructorId: refInstructorId } },
    create: {
      courseId,
      instructorId: refInstructorId,
      totalClicks: countedClick ? 1 : 0,
      totalEnrollments: 0,
      conversionRate: 0,
    },
    update: countedClick ? { totalClicks: { increment: 1 } } : {},
  });

  let enrolled = false;

  if (user && user.id !== course.userId) {
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { courseId, userId: user.id },
      select: { id: true },
    });

    if (!existingEnrollment) {
      const transactionResults = await prisma.$transaction([
        prisma.enrollment.create({ data: { courseId, userId: user.id } }),
        prisma.courseStudents.upsert({
          where: { courseId_studentId: { courseId, studentId: user.id } },
          create: { courseId, studentId: user.id, refInstructorId },
          update: { refInstructorId },
        }),
        prisma.courseShareStats.update({
          where: { courseId_instructorId: { courseId, instructorId: refInstructorId } },
          data: { totalEnrollments: { increment: 1 } },
        }),
      ]);
      stats = transactionResults[2];
      enrolled = true;
    }
  }

  const conversionRate = computeConversion(stats.totalClicks, stats.totalEnrollments);
  if (conversionRate !== stats.conversionRate) {
    stats = await prisma.courseShareStats.update({
      where: { courseId_instructorId: { courseId, instructorId: refInstructorId } },
      data: { conversionRate },
    });
  }

  return NextResponse.json({
    countedClick,
    enrolled,
    stats: {
      totalClicks: stats.totalClicks,
      totalEnrollments: stats.totalEnrollments,
      conversionRate: stats.conversionRate,
    },
  });
}
