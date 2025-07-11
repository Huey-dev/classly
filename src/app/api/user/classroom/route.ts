import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        // const newClass= await prisma.user.create({
        //     data: {
        //         // email,
        //         // password: hashedPassword,
        //     },
        // });
        // add logic
    } catch (error) {
        // add error statements
    }
}