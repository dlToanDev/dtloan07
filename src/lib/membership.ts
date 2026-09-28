export type MembershipPlanValue = 'PRO_MONTH' | 'PRO_YEAR';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Giá gói Pro cố định; đổi giá ở đây là đủ (server luôn tính tiền theo bảng này). */
export const PRO_PLANS: Record<
  MembershipPlanValue,
  { label: string; priceVnd: number; days: number; hint: string }
> = {
  PRO_MONTH: { label: 'Pro 1 tháng', priceVnd: 20000, days: 30, hint: '20.000 đ / 30 ngày' },
  PRO_YEAR: {
    label: 'Pro 1 năm',
    priceVnd: 180000,
    days: 365,
    hint: '180.000 đ / 365 ngày — tiết kiệm 25%',
  },
};

export const PRO_BENEFITS = [
  'Đăng bài viết lên blog',
  'Luôn miễn phí ship khi mua hàng',
  'Voucher bí mật chỉ dành cho tài khoản Pro',
  'Huy hiệu PRO cạnh tên tài khoản',
];

export function isPro(user: { proUntil: Date | null } | null | undefined, now = new Date()) {
  return Boolean(user?.proUntil && user.proUntil > now);
}

/** Hạn Pro mới sau khi mua thêm `days` ngày: còn hạn thì cộng dồn, hết hạn thì tính từ bây giờ. */
export function extendProUntil(current: Date | null, days: number, now = new Date()) {
  const base = current && current > now ? current : now;
  return new Date(base.getTime() + days * DAY_MS);
}

export function proDaysLeft(proUntil: Date | null, now = new Date()) {
  if (!proUntil || proUntil <= now) return 0;
  return Math.ceil((proUntil.getTime() - now.getTime()) / DAY_MS);
}
