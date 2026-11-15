import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/** 5 failed sign-ins for one email lock it for 15 minutes. */
const MAX_FAILURES = 5;
const LOCK_WINDOW_MS = 15 * 60_000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase().slice(0, 160);
        const password = credentials?.password;
        if (!email || !password) return null;

        // slow down password guessing: after MAX_FAILURES failures in the window, refuse
        // before running bcrypt (which is deliberately expensive)
        const since = new Date(Date.now() - LOCK_WINDOW_MS);
        if ((await db.loginAttempt.count({ where: { key: email, createdAt: { gt: since } } })) >= MAX_FAILURES) {
          throw new Error("too_many");
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          await db.$transaction([
            db.loginAttempt.create({ data: { key: email } }),
            db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } }), // keep the table tiny
          ]);
          return null;
        }
        await db.loginAttempt.deleteMany({ where: { key: email } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/admin/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

export const getSession = () => getServerSession(authOptions);
