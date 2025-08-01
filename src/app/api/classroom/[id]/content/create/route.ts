import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../../../lib/auth/getUserFromRequest";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromRequest();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const classroomId = params.id
        const body = await request.json()
        const { title, description, type, url} = body
        if (!title || !description || !type || !url || !classroomId) {
            return NextResponse.json("Fill Missing field", { status: 400 })
        }

        const content = await prisma.content.create({
            data: {
                title, description, type, url, classroomId, userId: user.id,
            }
        })
        return NextResponse.json({ message: "creation successful", content }, { status: 200 })
    } catch (error) {
        console.error("Error creating content:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

}