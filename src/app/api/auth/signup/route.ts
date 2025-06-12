import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { generateSalt, hashPassword } from "../../../../../lib/passwordHasher";
import { setAuthCookies } from "../../../../../lib/auth";

const prisma = new PrismaClient();


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
        const salt = await generateSalt()
        const hashedPassword = await hashPassword(password, salt);
        // Create a new user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                salt
            },
        });
        await setAuthCookies(newUser.id)
        // return response without password
        const { password: _, ...userWithoutPassword } = newUser;
        // Return the new user with data in the response
        return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
    } catch (error) {
        console.error("Error in signup route:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

}

// to do revert back to bcrypt