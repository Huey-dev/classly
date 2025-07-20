
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../../lib/prisma"


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
        // if user does not exist return an error
        if (!existingUser) {
            return NextResponse.json({ error: "Invalid Credentials", status: 403 })
        }
        //  Check password whether it matches users current password
        const validPassword = await bcrypt.compare(password, existingUser.password!);
        // If password does not match return error to user
        if (!validPassword) {
            return NextResponse.json({ error: "Invalid Credentials", status: 403 })
        }
        // Generate an access token (JWT) with a short expiration time
        const JWT_SECRET = process.env.JWT_SECRET_KEY;
        const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;
        if (!JWT_SECRET || !REFRESH_SECRET) {
            console.error("JWT secret keys not configured!");
            return NextResponse.json({ error: "Internal Server Error - Configuration missing" }, { status: 500 });
        }
        //  store user id in the token
        const userPayload = { userId: existingUser.id };
        const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });
        const refreshToken = jwt.sign(userPayload, REFRESH_SECRET, { expiresIn: "7d" });
        // send these tokens to the client securely.
        // Get cookie store
        const cookieStore = await cookies();
        cookieStore.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 15 * 60,
            path: "/",
            sameSite: "strict"
        })

        cookieStore.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
            sameSite: "strict"
        })
        return NextResponse.json({
            message: "Login successful",
            user: {
                id: existingUser.id,
                email: existingUser.email
            }
        }, { status: 200 });
    } catch (error) {
        console.error("Error in signup route:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}