import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";


// FIX: We are adopting the structure where the params object itself is wrapped 
// in a Promise type, which is required by very strict Next.js App Router static analysis.
// This resolves the error: "Type { params: { id: string; }; } is not a valid type for the function's second argument."
export async function GET(
    request: NextRequest, 
    context: { params: Promise<{ id: string }> } // <-- Corrected type for strict environments
) {
    let classroomId: string;
    
    try {
        // 1. Await the parameters object to resolve the Promise type
        const resolvedParams = await context.params; 
        classroomId = resolvedParams.id;
    } catch (e) {
        // Handle case where params resolution fails
        return NextResponse.json({ 
            error: 'Failed to resolve route parameters.' 
        }, { status: 400 });
    }
    
    // Now continue with the existing logic using the resolved classroomId
    if (!classroomId) {
        return NextResponse.json({ 
            error: 'Missing classroom ID in route parameters.' 
        }, { status: 400 });
    }

    try {
        const user = await getUserFromRequest();
        
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // Fetch individual class details based on ID and ensure it belongs to the user
        const classroom = await prisma.classroom.findUnique({
            where: { 
                id: classroomId,
                userId: user.id // Restricting access to the owner
            },
            // You can optionally include related models here (e.g., modules, lessons)
        });

        if (!classroom) {
            // Return 404 if the classroom doesn't exist or doesn't belong to the user
            return NextResponse.json({ error: 'Classroom not found.' }, { status: 404 });
        }
        
        // Return the fetched data
        return NextResponse.json({ classroom }, { status: 200 });

    } catch (error) {
        console.error('API Error fetching classroom:', error);
        return NextResponse.json({ 
            error: 'Server error fetching classroom details',
            details: String(error)
        }, { status: 500 });
    }
}