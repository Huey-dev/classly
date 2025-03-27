import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
        Nodemailer({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
        }),
    ],
    secret: process.env.AUTH_SECRET,
    pages: {
        newUser: "/welcome",   
                        
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            return baseUrl;
        },
    },
});
