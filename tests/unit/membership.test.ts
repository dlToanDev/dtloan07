import { describe, it, expect } from 'vitest';
import { extendProUntil, isPro, PRO_PLANS, proDaysLeft } from '@/lib/membership';

const day = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-05T10:00:00Z');

describe('gói Pro', () => {
  it('giá cố định: 20k/30 ngày, 180k/365 ngày', () => {
    expect(PRO_PLANS.PRO_MONTH).toMatchObject({ priceVnd: 20000, days: 30 });
    expect(PRO_PLANS.PRO_YEAR).toMatchObject({ priceVnd: 180000, days: 365 });
  });

  it('isPro: còn hạn mới là Pro', () => {
    expect(isPro({ proUntil: null }, now)).toBe(false);
    expect(isPro({ proUntil: new Date(now.getTime() - 1) }, now)).toBe(false);
    expect(isPro({ proUntil: new Date(now.getTime() + day) }, now)).toBe(true);
    expect(isPro(null, now)).toBe(false);
  });

  it('chưa có / đã hết Pro → tính từ bây giờ', () => {
    expect(extendProUntil(null, 30, now).getTime()).toBe(now.getTime() + 30 * day);
    const expired = new Date(now.getTime() - 5 * day);
    expect(extendProUntil(expired, 30, now).getTime()).toBe(now.getTime() + 30 * day);
  });

  it('còn hạn → cộng dồn từ ngày hết hạn cũ', () => {
    const current = new Date(now.getTime() + 10 * day);
    expect(extendProUntil(current, 365, now).getTime()).toBe(current.getTime() + 365 * day);
  });

  it('số ngày còn lại làm tròn lên, hết hạn thì 0', () => {
    expect(proDaysLeft(new Date(now.getTime() + 1.2 * day), now)).toBe(2);
    expect(proDaysLeft(new Date(now.getTime() - day), now)).toBe(0);
    expect(proDaysLeft(null, now)).toBe(0);
  });
});
