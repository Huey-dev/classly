import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

//  // Generate an access token (JWT) with a short expiration time
//         const JWT_SECRET = process.env.JWT_SECRET_KEY;
//         const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;
//         if (!JWT_SECRET || !REFRESH_SECRET) {
//             console.error("JWT secret keys not configured!");
//             return NextResponse.json({ error: "Internal Server Error - Configuration missing" }, { status: 500 });
//         }
//         //  store user id in the token? Keep it minimal. User ID is often sufficient.
//         const userPayload = { userId: existingUser.id };
//         const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });
//         const refreshToken = jwt.sign(userPayload, REFRESH_SECRET, { expiresIn: "7d" });
//         // send these tokens to the client securely.
//         // Get cookie store
//         const cookieStore = await cookies();
//         cookieStore.set("accessToken", accessToken, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production",
//             maxAge: 15 * 60,
//             path: "/",
//             sameSite: "strict"
//         })

//         cookieStore.set("refreshToken", refreshToken, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production",
//             maxAge: 7 * 24 * 60 * 60,
//             path: "/",
//             sameSite: "strict"
//         })