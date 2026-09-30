import crypto from 'crypto';

/**
 * Danh sách các đường dẫn tĩnh cố định của hệ thống để phòng ngừa xung đột với token động.
 */
export const RESERVED_ROUTES = new Set([
  'about',
  'account',
  'admin',
  'affiliate',
  'afiuafhu283an',
  'api',
  'blog',
  'categories',
  'checkout',
  'courses',
  'go',
  'login',
  'orders',
  'privacy',
  'pro',
  'register',
  'robots.txt',
  'rss.xml',
  'search-index.json',
  'shop',
  'sitemap.xml',
  'subscribe',
  'tags',
  'terms',
  'unsubscribe',
  'verify',
  'verify-request',
]);

/**
 * Thời gian xoay vòng đường dẫn bảo mật (tính bằng phút). Mặc định là 30 phút.
 */
export function getAffiliateRotationMinutes(): number {
  const envVal = process.env.AFFILIATE_ROTATION_MINUTES;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 30;
}

/**
 * Secret key dùng để băm HMAC tạo token.
 */
export function getAffiliateSecret(): string {
  return (
    process.env.AFFILIATE_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    'dltoan07-secure-affiliate-token-default-secret-salt-2026'
  );
}

/**
 * Sinh token ngẫu nhiên bảo mật tương ứng với time slot.
 */
export function generateTokenForSlot(slot: number): string {
  const secret = getAffiliateSecret();
  let hash = crypto
    .createHmac('sha256', secret)
    .update(`affiliate_token_slot_${slot}`)
    .digest('hex')
    .slice(0, 16);

  // Trường hợp hi hữu nếu trùng với tên route có sẵn thì thêm salt
  if (RESERVED_ROUTES.has(hash.toLowerCase())) {
    hash = crypto
      .createHmac('sha256', secret)
      .update(`affiliate_token_slot_${slot}_alt_salting`)
      .digest('hex')
      .slice(0, 16);
  }

  return hash;
}

/**
 * Lấy chỉ số khung thời gian hiện tại
 */
export function getCurrentSlot(now: number = Date.now()): number {
  const intervalMs = getAffiliateRotationMinutes() * 60 * 1000;
  return Math.floor(now / intervalMs);
}

/**
 * Lấy token bảo mật đang hoạt động ở thời điểm hiện tại
 */
export function getCurrentAffiliateToken(now: number = Date.now()): string {
  const slot = getCurrentSlot(now);
  return generateTokenForSlot(slot);
}

/**
 * Trả về đường dẫn hoàn chỉnh của trang affiliate ngẫu nhiên, ví dụ: "/a4d8e9f2c1b035e7"
 */
export function getAffiliatePath(now: number = Date.now()): string {
  return `/${getCurrentAffiliateToken(now)}`;
}

/**
 * Kiểm tra xem token gửi lên có hợp lệ hay không.
 * Hỗ trợ cơ chế ân hạn (grace period) 1 chu kỳ liền kề trước đó
 * để người dùng đang mở tab hoặc vừa mới chuyển trang không bị gián đoạn 404 đột ngột.
 */
export function isValidAffiliateToken(
  token: string | undefined | null,
  now: number = Date.now(),
): boolean {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  if (!cleanToken || RESERVED_ROUTES.has(cleanToken.toLowerCase())) return false;

  const currentSlot = getCurrentSlot(now);
  const currentToken = generateTokenForSlot(currentSlot);
  const prevToken = generateTokenForSlot(currentSlot - 1);

  return cleanToken === currentToken || cleanToken === prevToken;
}

/**
 * Lấy thông tin hết hạn và thời gian còn lại của token hiện tại (phục vụ bộ đếm ngược)
 */
export function getAffiliateTokenExpiry(now: number = Date.now()) {
  const rotationMinutes = getAffiliateRotationMinutes();
  const intervalMs = rotationMinutes * 60 * 1000;
  const currentSlot = getCurrentSlot(now);
  const expiresAt = (currentSlot + 1) * intervalMs;
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

  return {
    currentSlot,
    expiresAt,
    remainingSeconds,
    rotationMinutes,
  };
}
