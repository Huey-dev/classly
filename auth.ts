import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import Google from "next-auth/providers/google"
import { prisma } from "./lib/prisma"

 
export const { handlers, signIn, signOut, auth } = NextAuth({
   adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET, 
 callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id ?? undefined;
      token.email = user.email;
      // token.hasOnboarded = user.hasOnboarded ?? false;
    }
    return token;
  },
  async session({ session, token }) {
    if (token?.id && typeof token.id === "string") {
      session.user.id = token.id;
      // session.user.hasOnboarded = token.hasOnboarded;
    }
    if (token?.email && typeof token.email === "string") {
      session.user.email = token.email;
    }
    return session;
  },
}

})