import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { db } from '@/lib/db';
import { sendMagicLinkEmail } from '@/lib/mail';
import { authConfig } from '@/lib/auth.config';
import bcrypt from 'bcryptjs';

/** Phiên đang đăng nhập được kiểm tra lại trạng thái khóa sau mỗi khoảng này. */
const LOCK_RECHECK_MS = 5 * 60 * 1000;

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
    async signIn({ user }) {
      if (await isLocked({ id: user.id, email: user.email })) return '/login?error=AccountLocked';
      return true;
    },
    // JWT nằm ở trình duyệt nên phải tự kiểm tra lại: bị khóa → trả null để xóa phiên.
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      if (!token?.id) return token;
      const checkedAt = typeof token.lockCheckedAt === 'number' ? token.lockCheckedAt : 0;
      if (params.user || Date.now() - checkedAt > LOCK_RECHECK_MS) {
        if (await isLocked({ id: token.id as string })) return null;
        token.lockCheckedAt = Date.now();
      }
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
