import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// when i want to log my users in, what do i do