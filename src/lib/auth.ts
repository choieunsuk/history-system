import { getServerSession, type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { compare } from "bcrypt";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  debug: process.env.NODE_ENV === "development",
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),

    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),

    ...(githubClientId && githubClientSecret
      ? [
          GitHub({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      // 로그인 시점: user 객체에서 id/role 초기화
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "일반";
      }

      // 이후 요청: DB에서 role 을 다시 읽어 최신화.
      // (관리자가 권한을 바꿔도 재로그인 없이 반영되도록)
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
