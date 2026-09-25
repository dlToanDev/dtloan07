import { z } from 'zod';

/**
 * Validate biến môi trường ngay khi module được load.
 *
 * Nguyên tắc: app phải CRASH khi thiếu env bắt buộc, thay vì chạy nửa vời
 * rồi đổ vỡ giữa luồng thanh toán. Mỗi phase sau sẽ chuyển các biến của mình
 * từ `.optional()` sang bắt buộc — xem ghi chú từng nhóm.
 *
 * Biến server-only KHÔNG được import vào Client Component.
 */

/**
 * Coi chuỗi rỗng trong `.env` là "chưa cấu hình".
 * Không có bước này thì `FOO=""` sẽ rơi vào nhánh validate và làm fail build
 * dù biến đó chưa tới phase cần dùng.
 */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // P5 — Database
  DATABASE_URL: optional(z.string().url()),
  DIRECT_URL: optional(z.string().url()),

  // P6 — Auth
  AUTH_SECRET: optional(z.string().min(32)),
  AUTH_URL: optional(z.string().url()),
  AUTH_GOOGLE_ID: optional(z.string()),
  AUTH_GOOGLE_SECRET: optional(z.string()),
  AUTH_GITHUB_ID: optional(z.string()),
  AUTH_GITHUB_SECRET: optional(z.string()),

  // P6 — Email
  RESEND_API_KEY: optional(z.string().startsWith('re_')),
  EMAIL_FROM: optional(z.string()),
  ADMIN_NOTIFY_EMAIL: optional(z.string().email()),

  // P9 — Storage (R2)
  R2_ACCOUNT_ID: optional(z.string()),
  R2_ACCESS_KEY_ID: optional(z.string()),
  R2_SECRET_ACCESS_KEY: optional(z.string()),
  R2_BUCKET: optional(z.string()),

  // P8 — Payment (PayOS)
  PAYOS_CLIENT_ID: optional(z.string()),
  PAYOS_API_KEY: optional(z.string()),
  PAYOS_CHECKSUM_KEY: optional(z.string()),

  // Affiliate — Rút gọn link kiếm tiền (MegaURL, Ouo.io, Shorte.st, etc.)
  SHORTENER_API_URL: optional(z.string().url()),
  SHORTENER_API_KEY: optional(z.string()),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

/**
 * Next.js chỉ inline biến `NEXT_PUBLIC_*` khi được truy cập theo đường dẫn
 * tĩnh đầy đủ, nên phải liệt kê tường minh — không destructure `process.env`.
 */
const clientRuntime = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:5000',
};

function parse<T extends z.ZodTypeAny>(schema: T, source: unknown, label: string): z.infer<T> {
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `❌ Biến môi trường ${label} không hợp lệ:\n${issues}\n\n` +
        `→ Kiểm tra file .env (tham chiếu .env.example).`,
    );
  }

  return parsed.data;
}

export const serverEnv = parse(serverSchema, process.env, 'server');
export const clientEnv = parse(clientSchema, clientRuntime, 'client');

export const isProduction = serverEnv.NODE_ENV === 'production';
export const isDevelopment = serverEnv.NODE_ENV === 'development';

/**
 * Dùng ở đầu mỗi module cần env của phase sau, để lỗi cấu hình lộ ra
 * đúng chỗ thay vì thành `undefined` trôi xuống tận request của khách.
 */
export function requireEnv<K extends keyof typeof serverEnv>(
  key: K,
): NonNullable<(typeof serverEnv)[K]> {
  const value = serverEnv[key];

  if (value === undefined || value === '') {
    throw new Error(`❌ Thiếu biến môi trường bắt buộc: ${String(key)}`);
  }

  return value as NonNullable<(typeof serverEnv)[K]>;
}
