import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
type CreateClassroomPayload = {
    image: string
    name: string;
    description?: string;
};
export async function POST(request: NextRequest) {
    const session = await auth()

    try {
        // CHECK USER SESSION FOR OAUTH
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // FIND THE USER OAUTH ACCOUNT
        let user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body: CreateClassroomPayload = await request.json();
        const { name, image, description } = body;

        // RUN CHECKS
        if (typeof name !== 'string' || !name) {
            return NextResponse.json({ error: 'name cannot be blank' },
                { status: 400 })
        }
        // ALLOW ONLY UNIQUE CHANNEL NAME PER USER
        const existing = await prisma.classroom.findUnique({
            where: {
                name_userId: { name, userId: user.id },
            }
        });
        if (existing) {
            return NextResponse.json(
                { error: "You already have a classroom with this name" },
                { status: 409 }
            );
        }
        // CREATE NEW CLASS
        const classroom = await prisma.classroom.create({
            data: {
                name,
                image,
                description,
                userId: user.id,
                slug: `${name.toLowerCase().replace(/ /g, "-")}-${Date.now()}`,
            },
        });

    } catch (error) {
        // add error statements
    }
}