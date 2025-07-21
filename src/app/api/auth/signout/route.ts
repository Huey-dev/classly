import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {

    const cookieStore = await cookies();
    // Destroy custom JWT cookies (email/password users)
    cookieStore.set("accessToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: new Date(0), // Immediately expires
        path: "/",
        sameSite: "strict"
    });

    cookieStore.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: new Date(0),
        path: "/",
        sameSite: "strict"
    });

    // Redirect the user (optional)
    return NextResponse.json({ message: "Logged out" }, { status: 200 });
}
