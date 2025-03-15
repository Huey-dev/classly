import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(req: Request) {
    try {
        // ACCEPT USER DATA AND CONVERT TO JSON
        const body = await req.json()
        // EXTRACT EMAIL FROM BODY
        const { email,name } = body
        // Basic validation
        if (!email || !name) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // // Password strength validation
        // if (password.length < 8) {
        //     return NextResponse.json(
        //         { error: 'Password must be at least 8 characters long' },
        //         { status: 400 }
        //     );
        // }
        //  CHECK IF EMAIL EXISTS
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })
        // throw error if user exists
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }
        //   // Hash password
        //   const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await prisma.user.create({
            data: {
                email,
                //   password: hashedPassword,
                name,
                // Add any other fields your user model requires
            }
        });
        // return NextResponse.json(
        //     { message: 'User created successfully', },
        //     { status: 201 }
        // );
        return NextResponse.json(newUser, { status: 201 }, );
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}