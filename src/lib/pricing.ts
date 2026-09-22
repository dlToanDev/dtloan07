import { Coupon, CouponType } from '@prisma/client';

export interface CartItemInput {
  productId: string;
  qty: number;
}

export interface ProductPriceSnapshot {
  id: string;
  priceVnd: number;
  status: string;
}

export interface PricingItem {
  productId: string;
  qty: number;
  unitPriceVnd: number;
  itemTotalVnd: number;
}

export interface PricingResult {
  items: PricingItem[];
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  couponApplied: {
    code: string;
    type: CouponType;
    value: number;
    discountVnd: number;
  } | null;
  couponError?: string;
}

/**
 * Kiểm tra tính hợp lệ của mã giảm giá (Coupon).
 */
export function validateCoupon(
  coupon: Coupon | null | undefined,
  subtotalVnd: number,
  now: Date = new Date(),
): { valid: boolean; error?: string } {
  if (!coupon) {
    return { valid: false, error: 'Mã giảm giá không tồn tại.' };
  }

  if (!coupon.active) {
    return { valid: false, error: 'Mã giảm giá đã bị vô hiệu hoá.' };
  }

  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, error: 'Mã giảm giá chưa đến thời gian áp dụng.' };
  }

  if (coupon.endsAt && now > coupon.endsAt) {
    return { valid: false, error: 'Mã giảm giá đã hết hạn sử dụng.' };
  }

  if (
    coupon.maxUses !== null &&
    coupon.maxUses !== undefined &&
    coupon.usedCount >= coupon.maxUses
  ) {
    return { valid: false, error: 'Mã giảm giá đã hết lượt sử dụng.' };
  }

  if (subtotalVnd <= 0) {
    return { valid: false, error: 'Đơn hàng chưa có sản phẩm để áp dụng mã.' };
  }

  return { valid: true };
}

/**
 * Tính toán giá tiền đơn hàng: Subtotal, Discount và Total
 * Đảm bảo:
 * - Không làm tròn sai lệch (tiền VND là số nguyên)
 * - Discount không bao giờ vượt quá Subtotal
 * - Total không bao giờ âm (>= 0)
 */
export function calculatePricing({
  items,
  productsMap,
  coupon,
  now = new Date(),
}: {
  items: CartItemInput[];
  productsMap: Map<string, ProductPriceSnapshot>;
  coupon?: Coupon | null;
  now?: Date;
}): PricingResult {
  const pricingItems: PricingItem[] = [];
  let subtotalVnd = 0;

  for (const item of items) {
    // Bỏ qua số lượng không hợp lệ
    const qty = Math.max(1, Math.floor(item.qty || 1));
    const product = productsMap.get(item.productId);

    if (!product || product.status !== 'ACTIVE') {
      continue;
    }

    const unitPriceVnd = Math.max(0, Math.floor(product.priceVnd));
    const itemTotalVnd = unitPriceVnd * qty;

    subtotalVnd += itemTotalVnd;
    pricingItems.push({
      productId: item.productId,
      qty,
      unitPriceVnd,
      itemTotalVnd,
    });
  }

  let discountVnd = 0;
  let couponApplied: PricingResult['couponApplied'] = null;
  let couponError: string | undefined;

  if (coupon) {
    const validation = validateCoupon(coupon, subtotalVnd, now);
    if (validation.valid) {
      if (coupon.type === CouponType.PERCENT) {
        // Giảm theo phần trăm: ví dụ value = 10 -> giảm 10%
        const percent = Math.min(100, Math.max(0, coupon.value));
        discountVnd = Math.round((subtotalVnd * percent) / 100);
      } else if (coupon.type === CouponType.FIXED) {
        // Giảm số tiền cố định VND
        discountVnd = Math.max(0, coupon.value);
      }

      // Discount không được vượt quá subtotal
      discountVnd = Math.min(discountVnd, subtotalVnd);

      couponApplied = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountVnd,
      };
    } else {
      couponError = validation.error;
    }
  }

  const totalVnd = Math.max(0, subtotalVnd - discountVnd);

  return {
    items: pricingItems,
    subtotalVnd,
    discountVnd,
    totalVnd,
    couponApplied,
    couponError,
  };
}
