import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import prisma from "../../../../../lib/prisma";

export async function POST(req: NextRequest) {
    try {
        // parse the request body
        const data = await req.json();

        // destructure the data
        const { email, password } = data;

        // check if the request body is valid
        if (!data || !data.email || !data.password) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        
        // validate inputs
        if (typeof email !== "string" || typeof password!== "string") {
            return NextResponse.json({error: "invalid input types"}, {status: 400})
        }
        // check if the user aready exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });
        // if the user already exists, return an error
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }
        // hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // create the user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        return NextResponse.json({message: "User created successfully", user}, { status: 201 });

    } catch (error) {
        console.error("Error in signup route:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        
    }
}