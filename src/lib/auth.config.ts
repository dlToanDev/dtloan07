import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { Role } from '@prisma/client';

const googleClientId = (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = (
  process.env.AUTH_GOOGLE_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  ''
).trim();

const githubClientId = (process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID || '').trim();
const githubClientSecret = (
  process.env.AUTH_GITHUB_SECRET ||
  process.env.GITHUB_CLIENT_SECRET ||
  ''
).trim();

export const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);
export const isGitHubAuthEnabled = Boolean(githubClientId && githubClientSecret);

/**
 * Cấu hình Auth nhẹ, an toàn cho Edge Runtime (dùng trong middleware).
 * Tuyệt đối KHÔNG import adapter DB (Prisma) hay module Node.js native ở đây.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET || '4fVOzlSivMXHM0k5diBb2E9ZAW39XGzLlaYThCbGYkw=',
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify',
  },
  providers: [
    Google({
      clientId: googleClientId || undefined,
      clientSecret: googleClientSecret || undefined,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    GitHub({
      clientId: githubClientId || undefined,
      clientSecret: githubClientSecret || undefined,
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? Role.USER;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        } else if (token.sub) {
          session.user.id = token.sub as string;
        }
        session.user.role = (token.role as Role) ?? Role.USER;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role;

      const isAccountRoute = nextUrl.pathname.startsWith('/account');
      const isAdminRoute = nextUrl.pathname.startsWith('/admin');
      const isCheckoutRoute = nextUrl.pathname.startsWith('/checkout');

      if (isCheckoutRoute) {
        return isLoggedIn;
      }

      if (isAccountRoute) {
        return isLoggedIn;
      }

      if (isAdminRoute) {
        return isLoggedIn && userRole === Role.ADMIN;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
