import { describe, it, expect } from 'vitest';
import {
  canUseCOD,
  quoteShipping,
  splitCartTotals,
  VN_PHONE_RE,
  type ShippingZoneSnapshot,
} from '@/lib/shop/shipping';

const zone = (over: Partial<ShippingZoneSnapshot> & { id: string }): ShippingZoneSnapshot => ({
  name: over.id,
  provinces: [],
  feeVnd: 30000,
  freeShipFromVnd: null,
  isDefault: false,
  sortOrder: 0,
  ...over,
});

const noiThanh = zone({ id: 'noi-thanh', provinces: ['ha-noi'], feeVnd: 20000, sortOrder: 0 });
const lanCan = zone({
  id: 'lan-can',
  provinces: ['ha-noi', 'bac-ninh'],
  feeVnd: 30000,
  sortOrder: 1,
});
const toanQuoc = zone({ id: 'toan-quoc', feeVnd: 40000, isDefault: true, sortOrder: 99 });

describe('quoteShipping', () => {
  it('chọn khu chứa tỉnh', () => {
    const result = quoteShipping({
      zones: [lanCan, toanQuoc],
      provinceCode: 'bac-ninh',
      physicalSubtotalVnd: 100000,
    });
    expect(result).toEqual({ feeVnd: 30000, zoneName: 'lan-can', freeShip: false });
  });

  it('tỉnh thuộc nhiều khu thì lấy khu có sortOrder nhỏ nhất', () => {
    const result = quoteShipping({
      zones: [lanCan, noiThanh, toanQuoc],
      provinceCode: 'ha-noi',
      physicalSubtotalVnd: 100000,
    });
    expect(result.feeVnd).toBe(20000);
    expect(result.zoneName).toBe('noi-thanh');
  });

  it('tỉnh không thuộc khu nào thì rơi về khu mặc định', () => {
    const result = quoteShipping({
      zones: [noiThanh, toanQuoc],
      provinceCode: 'ca-mau',
      physicalSubtotalVnd: 100000,
    });
    expect(result.feeVnd).toBe(40000);
  });

  it('không có khu nào khớp và không có khu mặc định thì phí 0', () => {
    const result = quoteShipping({
      zones: [noiThanh],
      provinceCode: 'ca-mau',
      physicalSubtotalVnd: 100000,
    });
    expect(result).toEqual({ feeVnd: 0, zoneName: null, freeShip: false });
  });

  it('miễn phí ship khi đạt đúng ngưỡng, chưa đạt thì vẫn tính phí', () => {
    const zones = [
      zone({ id: 'z', provinces: ['ha-noi'], feeVnd: 20000, freeShipFromVnd: 500000 }),
    ];
    expect(quoteShipping({ zones, provinceCode: 'ha-noi', physicalSubtotalVnd: 500000 })).toEqual({
      feeVnd: 0,
      zoneName: 'z',
      freeShip: true,
    });
    expect(
      quoteShipping({ zones, provinceCode: 'ha-noi', physicalSubtotalVnd: 499999 }).feeVnd,
    ).toBe(20000);
  });

  it('không có tỉnh thì chưa tính được phí', () => {
    expect(quoteShipping({ zones: [toanQuoc], provinceCode: '', physicalSubtotalVnd: 0 })).toEqual({
      feeVnd: 0,
      zoneName: null,
      freeShip: false,
    });
  });
});

describe('splitCartTotals', () => {
  const lines = [
    { productId: 'shirt', variantId: 'v1', qty: 2, type: 'PHYSICAL' as const },
    { productId: 'ebook', variantId: 'v2', qty: 1, type: 'DOWNLOAD' as const },
  ];
  const pricing = [
    { productId: 'shirt', variantId: 'v1', itemTotalVnd: 300000 },
    { productId: 'ebook', variantId: 'v2', itemTotalVnd: 100000 },
  ];

  it('tách tạm tính hàng vật lý và phân bổ giảm giá theo tỉ lệ', () => {
    const totals = splitCartTotals({ lines, pricingItems: pricing, discountVnd: 40000 });
    expect(totals.physicalSubtotalVnd).toBe(300000);
    // 40.000 × 300.000/400.000 = 30.000
    expect(totals.physicalAfterDiscountVnd).toBe(270000);
    expect(totals.hasPhysical).toBe(true);
    expect(totals.allPhysical).toBe(false);
  });

  it('giỏ toàn hàng số: không có hàng vật lý', () => {
    const totals = splitCartTotals({
      lines: [{ productId: 'ebook', variantId: 'v2', qty: 1, type: 'DOWNLOAD' }],
      pricingItems: [{ productId: 'ebook', variantId: 'v2', itemTotalVnd: 100000 }],
      discountVnd: 0,
    });
    expect(totals.physicalSubtotalVnd).toBe(0);
    expect(totals.hasPhysical).toBe(false);
    expect(totals.allPhysical).toBe(false);
  });

  it('giảm giá không làm tạm tính hàng vật lý xuống dưới 0', () => {
    const totals = splitCartTotals({
      lines: [{ productId: 'shirt', variantId: 'v1', qty: 1, type: 'PHYSICAL' }],
      pricingItems: [{ productId: 'shirt', variantId: 'v1', itemTotalVnd: 100000 }],
      discountVnd: 999999,
    });
    expect(totals.physicalAfterDiscountVnd).toBe(0);
  });
});

describe('canUseCOD', () => {
  it('chỉ cho COD khi mọi món đều là hàng vật lý', () => {
    expect(canUseCOD([{ productId: 'a', variantId: 'v', qty: 1, type: 'PHYSICAL' }])).toBe(true);
    expect(
      canUseCOD([
        { productId: 'a', variantId: 'v', qty: 1, type: 'PHYSICAL' },
        { productId: 'b', variantId: 'v', qty: 1, type: 'DOWNLOAD' },
      ]),
    ).toBe(false);
    expect(canUseCOD([])).toBe(false);
  });
});

describe('VN_PHONE_RE', () => {
  it('nhận số Việt Nam 10 chữ số hoặc +84', () => {
    expect(VN_PHONE_RE.test('0912345678')).toBe(true);
    expect(VN_PHONE_RE.test('+84912345678')).toBe(true);
    expect(VN_PHONE_RE.test('091234567')).toBe(false);
    expect(VN_PHONE_RE.test('abc')).toBe(false);
  });
});
