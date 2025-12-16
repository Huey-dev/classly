import NextAuth from "next-auth"
import type { User as PrismaUser } from "@prisma/client"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import Google from "next-auth/providers/google"
import { prisma } from "./lib/prisma"
type SessionUser = PrismaUser & { hasOnboarded?: boolean };

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Force Google to show the account picker on each sign-in
          prompt: "select_account",
        },
      },
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
        token.hasOnboarded = (user as SessionUser).hasOnboarded ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      const user = session.user as typeof session.user & {
        id: string;
        email: string;
        hasOnboarded?: boolean;
      };

      if (token?.id && typeof token.id === "string") {
        user.id = token.id;
      }

      if (token?.email && typeof token.email === "string") {
        user.email = token.email;
      }

      user.hasOnboarded = typeof token.hasOnboarded === "boolean" ? token.hasOnboarded : false;

      return session;
    }
    ,
  }

})
