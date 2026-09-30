import { describe, it, expect } from 'vitest';
import {
  calculatePricing,
  shippingDiscountFor,
  validateCoupon,
  type CouponRule,
  type ProductPriceSnapshot,
} from '@/lib/pricing';

const products = new Map<string, ProductPriceSnapshot>([
  [
    'ao',
    { id: 'ao', priceVnd: 300000, status: 'ACTIVE', categoryId: 'cat_apparel', type: 'PHYSICAL' },
  ],
  [
    'src',
    {
      id: 'src',
      priceVnd: 500000,
      status: 'ACTIVE',
      categoryId: 'cat_source_code',
      type: 'DOWNLOAD',
    },
  ],
  [
    'acc',
    { id: 'acc', priceVnd: 200000, status: 'ACTIVE', categoryId: 'cat_account', type: 'ACCOUNT' },
  ],
]);

function rule(patch: Partial<CouponRule>): CouponRule {
  return {
    code: 'TEST',
    type: 'PERCENT',
    value: 10,
    maxUses: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    active: true,
    ...patch,
  };
}

const cart = [
  { productId: 'ao', qty: 1 },
  { productId: 'src', qty: 1 },
];

describe('voucher theo danh mục', () => {
  it('chỉ giảm trên phần hàng thuộc danh mục áp dụng', () => {
    const result = calculatePricing({
      items: cart,
      productsMap: products,
      coupon: rule({ scope: 'CATEGORIES', categoryIds: ['cat_apparel'] }),
    });
    expect(result.subtotalVnd).toBe(800000);
    expect(result.discountVnd).toBe(30000);
    expect(result.totalVnd).toBe(770000);
  });

  it('giảm tiền cố định không vượt quá phần hàng hợp lệ', () => {
    const result = calculatePricing({
      items: cart,
      productsMap: products,
      coupon: rule({
        type: 'FIXED',
        value: 400000,
        scope: 'CATEGORIES',
        categoryIds: ['cat_apparel'],
      }),
    });
    expect(result.discountVnd).toBe(300000);
  });

  it('giỏ không có hàng thuộc danh mục → báo lỗi, không giảm', () => {
    const result = calculatePricing({
      items: [{ productId: 'src', qty: 1 }],
      productsMap: products,
      coupon: rule({ scope: 'CATEGORIES', categoryIds: ['cat_apparel'] }),
    });
    expect(result.discountVnd).toBe(0);
    expect(result.couponApplied).toBeNull();
    expect(result.couponError).toContain('không áp dụng');
  });

  it('phạm vi ALL giảm trên cả đơn', () => {
    const result = calculatePricing({ items: cart, productsMap: products, coupon: rule({}) });
    expect(result.discountVnd).toBe(80000);
  });
});

describe('giảm tối đa và đơn tối thiểu', () => {
  it('giảm % bị chặn bởi mức giảm tối đa', () => {
    const result = calculatePricing({
      items: cart,
      productsMap: products,
      coupon: rule({ value: 50, maxDiscountVnd: 100000 }),
    });
    expect(result.discountVnd).toBe(100000);
  });

  it('đơn tối thiểu tính trên phần hàng hợp lệ', () => {
    const coupon = rule({ minOrderVnd: 400000, scope: 'CATEGORIES', categoryIds: ['cat_apparel'] });
    const result = calculatePricing({ items: cart, productsMap: products, coupon });
    expect(result.couponApplied).toBeNull();
    expect(result.couponError).toContain('400.000');
  });
});

describe('free ship', () => {
  it('không giảm tiền hàng, chỉ đánh dấu miễn ship', () => {
    const result = calculatePricing({
      items: cart,
      productsMap: products,
      coupon: rule({ type: 'FREE_SHIP', value: 0 }),
    });
    expect(result.discountVnd).toBe(0);
    expect(result.couponApplied?.type).toBe('FREE_SHIP');
  });

  it('miễn toàn bộ phí ship khi value = 0, chặn theo mức tối đa khi value > 0', () => {
    const full = calculatePricing({
      items: cart,
      productsMap: products,
      coupon: rule({ type: 'FREE_SHIP', value: 0 }),
    });
    expect(shippingDiscountFor(full.couponApplied, 35000)).toBe(35000);
    const capped = calculatePricing({
      items: cart,
      productsMap: products,
      coupon: rule({ type: 'FREE_SHIP', value: 20000 }),
    });
    expect(shippingDiscountFor(capped.couponApplied, 35000)).toBe(20000);
    expect(shippingDiscountFor(capped.couponApplied, 15000)).toBe(15000);
  });

  it('cần hàng vật lý thuộc phạm vi áp dụng', () => {
    const result = calculatePricing({
      items: [{ productId: 'src', qty: 1 }],
      productsMap: products,
      coupon: rule({ type: 'FREE_SHIP', value: 0 }),
    });
    expect(result.couponApplied).toBeNull();
    expect(result.couponError).toContain('giao hàng');
  });

  it('mã giảm tiền không miễn phí ship', () => {
    const result = calculatePricing({ items: cart, productsMap: products, coupon: rule({}) });
    expect(shippingDiscountFor(result.couponApplied, 35000)).toBe(0);
  });
});

describe('validateCoupon', () => {
  it('giữ luật cũ: hết lượt, hết hạn', () => {
    expect(validateCoupon(rule({ maxUses: 1, usedCount: 1 }), 100000).error).toContain('hết lượt');
    expect(validateCoupon(rule({ endsAt: new Date('2020-01-01') }), 100000).error).toContain(
      'hết hạn',
    );
  });
});
