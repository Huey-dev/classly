import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import { prisma } from "../../../../../lib/prisma";


export async function POST(request: NextRequest) {
    try {
        // Parse the request body as JSON
        const body = await request.json();
        const { email, password } = body;
        // Check if email and password are provided and are non-empty strings.
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }
        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        // remove password from result
        const { password: _, ...userWithoutPassword } = newUser;
        // Return the new user
        return NextResponse.json({ user: userWithoutPassword  }, { status: 201 });
    } catch (error) {
        console.error("Error in signup route:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}