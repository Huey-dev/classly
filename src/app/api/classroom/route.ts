import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";
// CREATE CLASSROOM
type CreateClassroomPayload = {
  image: string;
  name: string;
  description?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateClassroomPayload = await request.json();
    const { name, image, description } = body;

    if (typeof name !== "string" || !name) {
      return NextResponse.json({ error: "name cannot be blank" }, { status: 400 });
    }

    const existing = await prisma.classroom.findUnique({
      where: {
        name_userId: { name, userId: user.id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have a classroom with this name" },
        { status: 409 }
      );
    }

    const classroom = await prisma.classroom.create({
      data: {
        name,
        image,
        description,
        userId: user.id,
        slug: `${name.toLowerCase().replace(/ /g, "-")}-${Date.now()}`,
      },
    });

    return NextResponse.json({ message: "new classroom created", classroom }, { status: 201 });
  } catch (error) {
    console.error("Error in creating classroom:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


// GET ALL CLASSROOMS
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const classrooms = await prisma.classroom.findMany({
      where: {userId: user.id}
    })
    return NextResponse.json({ classrooms }, { status: 200 });
  } catch (error) {
    console.error("error fetching classrooms",error)
    return NextResponse.json({error: "server error"},{status:500})
  }
}
