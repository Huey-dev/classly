import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import { PrismaClient } from '@prisma/client';
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
        // if user does not exist return an error
        if (!existingUser) {
            return NextResponse.json({ error: "Invalid Credentials", status: 403 })
        }
        //  Check password whether it matches users current password
        const validPassword = await bcrypt.compare(password, existingUser.password);
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
        //  store user id in the token? Keep it minimal. User ID is often sufficient.
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
// when i want to log my users in, what do i do
// since request is coming from client we neeed to find a way to handle it, think in user input(1)
// first of all the user will input so the input will naturally come on the backend as
// you haveto worry about a whole lot of things, the user will provide input of email and password to be able to comw back to the app, what would eventually go wrong
// they might not provide matchin email,or a wrong psswordi they provide any password and it enters then you have a shitty authentivcation
// lets validate everthinng mke sure what theyre putting in our input is to our standard, we need to check somethings
// like password does it match after they click submit, can we call the database real time as users type password whether it matches do we, no i dont think we can do that
// email check whether somebod with this email exists in our database if they do we allow them enter
