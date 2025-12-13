import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../lib/auth/getUserFromRequest";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/courses/[id]/nft-config
 *
 * Returns NFT configuration for a course.
 * Authenticated via unified getUserFromRequest().
 */
export async function GET(
  _req: Request,
  { params }: Params
) {
  const { id: courseId } = await params;

  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.courseNftConfig.findUnique({
    where: { courseId },
  });

  return NextResponse.json({ config });
}
