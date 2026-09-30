/**
 * In-memory sliding window rate limiter cho Next.js server runtime.
 * Tự động dọn dẹp các mục đã hết hạn để tránh rò rỉ bộ nhớ.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Chu kỳ dọn dẹp bộ nhớ mỗi 60 giây
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Thời điểm hết hạn (timestamp ms)
}

/**
 * Kiểm tra giới hạn tần suất request theo key (IP, user id, email...).
 *
 * @param key Chuỗi định danh cần áp dụng giới hạn
 * @param limit Số lượt cho phép tối đa trong khoảng thời gian
 * @param windowSeconds Thời gian của khung giới hạn (giây)
 */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, record);
    return {
      success: true,
      remaining: Math.max(0, limit - 1),
      reset: record.resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.resetAt,
  };
}

/**
 * Trích xuất an toàn địa chỉ IP thực tế từ Headers của request.
 */
export function getClientIp(
  headers: Headers | Record<string, string | string[] | undefined>,
): string {
  let forwardedFor: string | null = null;
  let realIp: string | null = null;

  if (headers instanceof Headers) {
    forwardedFor = headers.get('x-forwarded-for');
    realIp = headers.get('x-real-ip');
  } else {
    const f = headers['x-forwarded-for'];
    forwardedFor = Array.isArray(f) ? (f[0] ?? null) : (f ?? null);
    const r = headers['x-real-ip'];
    realIp = Array.isArray(r) ? (r[0] ?? null) : (r ?? null);
  }

  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  return '127.0.0.1';
}

/** Giới hạn đăng nhập: tối đa 10 lần thử / phút / IP */
export function checkAuthRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`auth:${identifier}`, 10, 60);
}

/** Giới hạn dò quét URL Admin: tối đa 15 lần thử / phút / IP */
export function checkAdminScanRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`admin-scan:${ip}`, 15, 60);
}

/** Giới hạn thanh toán / checkout: tối đa 20 request / phút / IP */
export function checkCheckoutRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`checkout:${ip}`, 20, 60);
}

/** Reset rate limit (dùng cho testing) */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
