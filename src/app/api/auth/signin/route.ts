import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import { PrismaClient } from '@prisma/client';


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
