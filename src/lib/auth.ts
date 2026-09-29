import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { db } from '@/lib/db';
import { sendMagicLinkEmail } from '@/lib/mail';
import { authConfig } from '@/lib/auth.config';
import bcrypt from 'bcryptjs';
import dns from 'node:dns';

// Trên hệ thống mạng có cấu hình IPv6 nhưng không ra ngoài được (vd. mạng cơ quan, VPN),
// Node.js undici (fetch) mặc định ưu tiên IPv6 dẫn đến lỗi ETIMEDOUT khi gọi Google OAuth API.
// Ưu tiên IPv4 để kết nối Google OAuth tức thì và ổn định.
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const LOCK_RECHECK_MS = 60 * 1000;

async function isLocked(where: { id?: string | null; email?: string | null }) {
  if (!where.id && !where.email) return false;
  const user = await db.user.findFirst({
    where: where.id ? { id: where.id } : { email: where.email!.toLowerCase() },
    select: { lockedAt: true },
  });
  return Boolean(user?.lockedAt);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    ...authConfig.callbacks,
    // Tài khoản bị khóa (3 cảnh báo / admin khóa) không đăng nhập được bằng mọi cách.
    async signIn({ user, account }) {
      if (await isLocked({ id: user.id, email: user.email })) return '/login?error=AccountLocked';

      const email = user.email?.toLowerCase().trim();

      // Phân biệt rõ ràng giữa Google và GitHub:
      // 1. Đăng nhập bằng GitHub: Nếu email này đã từng đăng nhập bằng Google thì chỉ cho phép Google (chặn GitHub)
      if (account?.provider === 'github' && email) {
        const existingGoogleAccount = await db.account.findFirst({
          where: {
            provider: 'google',
            user: { email },
          },
        });
        if (existingGoogleAccount) {
          return '/login?error=GitHubBlockedGoogleEmail';
        }
      }

      // 2. Đăng nhập bằng Google: Nếu email này đã từng đăng nhập bằng GitHub thì chỉ cho phép GitHub (chặn Google)
      if (account?.provider === 'google' && email) {
        const existingGithubAccount = await db.account.findFirst({
          where: {
            provider: 'github',
            user: { email },
          },
        });
        if (existingGithubAccount) {
          return '/login?error=GoogleBlockedGitHubEmail';
        }
      }

      return true;
    },
    // JWT nằm ở trình duyệt: đồng bộ quyền role và kiểm tra tài khoản khóa từ DB
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      if (!token) return token;

      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      if (!token.id) return token;

      const now = Date.now();
      const lastChecked = (token.lockCheckedAt as number) || 0;
      // Chỉ revalidate DB sau 60 giây, tránh query lặp lại 6-8 lần trong cùng 1 request
      if (token.role && now - lastChecked < LOCK_RECHECK_MS) {
        return token;
      }

      const dbUser = await db.user.findUnique({
        where: { id: token.id as string },
        select: { lockedAt: true, role: true, name: true, image: true },
      });
      if (!dbUser || dbUser.lockedAt) return null;
      token.role = dbUser.role;
      token.lockCheckedAt = now;
      if (dbUser.name && !token.name) token.name = dbUser.name;
      if (dbUser.image && !token.picture) token.picture = dbUser.image;
      return token;
    },
  },
  providers: [
    ...authConfig.providers,
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password || user.lockedAt) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || 'noreply@resend.dev',
      sendVerificationRequest: async ({ identifier: to, url }) => {
        await sendMagicLinkEmail({ to, url });
      },
    }),
  ],
  trustHost: true,
});
