/**
 * Simple in-memory Sliding Window Rate Limiter
 * Thích hợp cho môi trường đơn server (Node.js / VPS PM2).
 * Tự động giải phóng bộ nhớ cho các token quá hạn.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Dọn dẹp bản ghi cũ mỗi 5 phút một lần để tránh leak bộ nhớ
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        const validTimestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
        if (validTimestamps.length === 0) {
          store.delete(key);
        } else {
          record.timestamps = validTimestamps;
        }
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Kiểm tra giới hạn tần suất theo sliding window.
 *
 * @param key Khóa nhận diện (ví dụ: `sub:127.0.0.1`, `auth:user@mail.com`)
 * @param limit Số lần tối đa được gọi trong khung thời gian
 * @param windowSeconds Khung thời gian trượt (giây)
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60,
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const threshold = now - windowMs;

  const record = store.get(key) ?? { timestamps: [] };
  // Loại bỏ các request đã nằm ngoài cửa sổ thời gian
  const validTimestamps = record.timestamps.filter((ts) => ts > threshold);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0] ?? now;
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds: resetSeconds > 0 ? resetSeconds : 1,
    };
  }

  validTimestamps.push(now);
  store.set(key, { timestamps: validTimestamps });

  return {
    success: true,
    limit,
    remaining: limit - validTimestamps.length,
    resetSeconds: windowSeconds,
  };
}
