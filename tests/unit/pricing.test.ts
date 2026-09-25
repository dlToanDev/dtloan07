import { describe, it, expect } from 'vitest';
import { calculatePricing, validateCoupon, ProductPriceSnapshot } from '@/lib/pricing';
import { Coupon, CouponType } from '@prisma/client';

describe('Pricing & Coupon calculation (src/lib/pricing.ts)', () => {
  const mockProducts = new Map<string, ProductPriceSnapshot>([
    ['prod-1', { id: 'prod-1', priceVnd: 100000, status: 'ACTIVE' }],
    ['prod-2', { id: 'prod-2', priceVnd: 250000, status: 'ACTIVE' }],
    ['prod-inactive', { id: 'prod-inactive', priceVnd: 500000, status: 'DRAFT' }],
  ]);

  it('1. Tính tổng tiền cơ bản chính xác cho nhiều sản phẩm và số lượng', () => {
    const result = calculatePricing({
      items: [
        { productId: 'prod-1', qty: 2 }, // 200,000
        { productId: 'prod-2', qty: 1 }, // 250,000
      ],
      productsMap: mockProducts,
    });

    expect(result.subtotalVnd).toBe(450000);
    expect(result.discountVnd).toBe(0);
    expect(result.totalVnd).toBe(450000);
    expect(result.items).toHaveLength(2);
  });

  it('2. Bỏ qua các sản phẩm không ở trạng thái ACTIVE', () => {
    const result = calculatePricing({
      items: [
        { productId: 'prod-1', qty: 1 },
        { productId: 'prod-inactive', qty: 1 },
      ],
      productsMap: mockProducts,
    });

    expect(result.subtotalVnd).toBe(100000);
    expect(result.items).toHaveLength(1);
  });

  it('3. Áp dụng coupon PERCENT chính xác (giảm 10%)', () => {
    const coupon: Coupon = {
      id: 'c1',
      code: 'SALE10',
      type: CouponType.PERCENT,
      value: 10,
      maxUses: 100,
      usedCount: 0,
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: new Date(),
    };

    const result = calculatePricing({
      items: [{ productId: 'prod-1', qty: 1 }], // 100,000
      productsMap: mockProducts,
      coupon,
    });

    expect(result.subtotalVnd).toBe(100000);
    expect(result.discountVnd).toBe(10000);
    expect(result.totalVnd).toBe(90000);
    expect(result.couponApplied?.code).toBe('SALE10');
  });

  it('4. Áp dụng coupon FIXED chính xác (giảm 50,000 đ)', () => {
    const coupon: Coupon = {
      id: 'c2',
      code: 'GIAM50K',
      type: CouponType.FIXED,
      value: 50000,
      maxUses: 50,
      usedCount: 10,
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: new Date(),
    };

    const result = calculatePricing({
      items: [{ productId: 'prod-2', qty: 1 }], // 250,000
      productsMap: mockProducts,
      coupon,
    });

    expect(result.subtotalVnd).toBe(250000);
    expect(result.discountVnd).toBe(50000);
    expect(result.totalVnd).toBe(200000);
  });

  it('5. Giảm giá không bao giờ vượt quá Subtotal (Total không bao giờ âm)', () => {
    const coupon: Coupon = {
      id: 'c3',
      code: 'SUPER999K',
      type: CouponType.FIXED,
      value: 999000, // Lớn hơn giá hàng
      maxUses: 10,
      usedCount: 0,
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: new Date(),
    };

    const result = calculatePricing({
      items: [{ productId: 'prod-1', qty: 1 }], // 100,000
      productsMap: mockProducts,
      coupon,
    });

    expect(result.subtotalVnd).toBe(100000);
    expect(result.discountVnd).toBe(100000);
    expect(result.totalVnd).toBe(0);
  });

  it('6. Từ chối coupon đã bị vô hiệu hoá (active = false)', () => {
    const coupon: Coupon = {
      id: 'c4',
      code: 'DISABLED',
      type: CouponType.PERCENT,
      value: 20,
      maxUses: 100,
      usedCount: 5,
      startsAt: null,
      endsAt: null,
      active: false,
      createdAt: new Date(),
    };

    const validation = validateCoupon(coupon, 100000);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('vô hiệu hoá');
  });

  it('7. Từ chối coupon đã hết hạn sử dụng (endsAt quá khứ)', () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 ngày trước
    const coupon: Coupon = {
      id: 'c5',
      code: 'EXPIRED',
      type: CouponType.PERCENT,
      value: 15,
      maxUses: 100,
      usedCount: 1,
      startsAt: null,
      endsAt: pastDate,
      active: true,
      createdAt: new Date(),
    };

    const validation = validateCoupon(coupon, 100000);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('hết hạn');
  });

  it('8. Từ chối coupon chưa đến thời gian áp dụng (startsAt tương lai)', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 ngày sau
    const coupon: Coupon = {
      id: 'c6',
      code: 'FUTURE',
      type: CouponType.PERCENT,
      value: 15,
      maxUses: 100,
      usedCount: 0,
      startsAt: futureDate,
      endsAt: null,
      active: true,
      createdAt: new Date(),
    };

    const validation = validateCoupon(coupon, 100000);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('chưa đến thời gian');
  });

  it('9. Từ chối coupon khi đã đạt maxUses', () => {
    const coupon: Coupon = {
      id: 'c7',
      code: 'MAXED',
      type: CouponType.PERCENT,
      value: 50,
      maxUses: 5,
      usedCount: 5, // Đã hết lượt
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: new Date(),
    };

    const validation = validateCoupon(coupon, 100000);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('hết lượt');
  });

  it('10. Xử lý chuẩn hoá số lượng âm hoặc số thập phân', () => {
    const result = calculatePricing({
      items: [{ productId: 'prod-1', qty: -5 }],
      productsMap: mockProducts,
    });

    // Qty phải tối thiểu là 1
    expect(result.items[0]?.qty).toBe(1);
    expect(result.subtotalVnd).toBe(100000);
  });

  it('Tính giá theo biến thể: cùng sản phẩm, 2 biến thể giá khác nhau', () => {
    const variantMap = new Map<string, ProductPriceSnapshot>([
      ['shirt:black-m', { id: 'shirt', priceVnd: 150000, status: 'ACTIVE' }],
      ['shirt:white-l', { id: 'shirt', priceVnd: 170000, status: 'ACTIVE' }],
    ]);
    const result = calculatePricing({
      items: [
        { productId: 'shirt', variantId: 'black-m', qty: 2 },
        { productId: 'shirt', variantId: 'white-l', qty: 1 },
      ],
      productsMap: variantMap,
    });
    expect(result.subtotalVnd).toBe(470000);
    expect(result.items.map((item) => item.variantId)).toEqual(['black-m', 'white-l']);
  });
});
