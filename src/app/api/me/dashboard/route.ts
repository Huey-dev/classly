// File: src/app/api/me/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

/**
 * Dashboard data for the logged-in user:
 * - created courses (with latest escrow snapshot)
 * - enrolled courses (with course + author)
 */
export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [created, enrollments] = await Promise.all([
      // Created courses
      prisma.course.findMany({
        where: { userId: user.id },
        include: {
          escrowLinks: {
            orderBy: { lockedAt: "desc" },
            take: 1,
            select: {
              scriptAddress: true,
              netTotal: true,
              paidOut: true,
              paidCount: true,
              released30: true,
              released40: true,
              releasedFinal: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              contents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Enrolled courses
      prisma.enrollment.findMany({
        where: {
          userId: user.id,
          courseId: { not: null },
        },
        include: {
          course: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  enrollments: true,
                  contents: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      }),
    ]);

    // Serialize Decimal/BigInt fields
    const serializeEscrow = (escrow: any) => ({
      ...escrow,
      netTotal: escrow.netTotal ? Number(escrow.netTotal) : 0,
      paidOut: escrow.paidOut ? Number(escrow.paidOut) : 0,
    });

    const serializedCreated = created.map((course) => ({
      ...course,
      escrowLinks: course.escrowLinks.map(serializeEscrow),
    }));

    // Flatten enrollments → courses
    const enrolledCourses = enrollments
      .map((e) => e.course)
      .filter(Boolean);

    return NextResponse.json({
      created: serializedCreated,
      enrolled: enrolledCourses,
    });
  } catch (e: any) {
    console.error("Dashboard API error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load dashboard" },
      { status: 500 }
    );
  }
}