import { NextRequest, NextResponse } from 'next/server';
// ADDED IMPORTS based on your suggested snippet for database access
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";


// Define the expected structure of the URL parameters
interface RouteParams {
    params: {
        id: string; // The dynamic segment '[id]' from the file path
    };
}

// The handler function signature is correct: it takes the request and the destructured params object.
export async function GET(
    request: NextRequest, 
    { params }: RouteParams
) {
    // Extract the classroom ID from the destructured params object
    const classroomId = params.id;

    if (!classroomId) {
        // This is a robust check, although not strictly necessary for a dynamic route
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