import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
type Role = (typeof Role)[keyof typeof Role];

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

const configuredSecret = (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '').trim();
const devFallbackSecret = 'development-only-auth-secret-32-chars-long!';

const authSecrets = Array.from(
  new Set([configuredSecret, process.env.NODE_ENV !== 'production' ? devFallbackSecret : '']),
).filter((s): s is string => Boolean(s && s.length >= 32));

/**
 * Cấu hình Auth nhẹ, an toàn cho Edge Runtime (dùng trong middleware).
 * Tuyệt đối KHÔNG import adapter DB (Prisma) hay module Node.js native ở đây.
 */
export const authConfig = {
  secret: authSecrets.length > 1 ? authSecrets : authSecrets[0] || devFallbackSecret,
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify',
  },
  logger: {
    error(error) {
      const errorType = (error as { type?: string })?.type || (error as Error)?.name;
      if (errorType === 'JWTSessionError') {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[auth] Phát hiện session token cũ hoặc không hợp lệ từ trình duyệt (JWTSessionError). Phiên sẽ được đặt lại.',
          );
        }
        return;
      }
      console.error(error);
    },
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
