import type { Coupon, CouponScope, CouponType } from '@prisma/client';
import { lineKey, type ProductTypeValue } from '@/lib/shop/variants';

export interface CartItemInput {
  productId: string;
  variantId?: string;
  qty: number;
}

export interface ProductPriceSnapshot {
  id: string;
  priceVnd: number;
  status: string;
  /** Dùng để xét phạm vi áp dụng của voucher theo danh mục. */
  categoryId?: string | null;
  /** Free ship chỉ áp khi có hàng vật lý thuộc phạm vi áp dụng. */
  type?: ProductTypeValue;
}

export interface PricingItem {
  productId: string;
  variantId?: string;
  qty: number;
  unitPriceVnd: number;
  itemTotalVnd: number;
}

/**
 * Điều kiện của một voucher. Các trường sau `active` là tùy chọn để coupon cũ
 * (chưa có phạm vi, đơn tối thiểu…) vẫn tính như trước: áp cho cả đơn.
 */
export type CouponRule = Pick<
  Coupon,
  'type' | 'value' | 'maxUses' | 'usedCount' | 'startsAt' | 'endsAt' | 'active'
> & {
  /** Mã khách đã nhập (mã công khai hoặc mã riêng). */
  code: string | null;
  maxDiscountVnd?: number | null;
  minOrderVnd?: number;
  scope?: CouponScope;
  categoryIds?: string[];
};

export interface CouponApplied {
  code: string;
  type: CouponType;
  value: number;
  /** Tiền hàng được giảm; free ship tính riêng bằng `shippingDiscountFor`. */
  discountVnd: number;
}

export interface PricingResult {
  items: PricingItem[];
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  couponApplied: CouponApplied | null;
  couponError?: string;
}

const money = (vnd: number) => `${vnd.toLocaleString('vi-VN')} đ`;

/**
 * Kiểm tra voucher có dùng được không.
 * `eligibleSubtotalVnd` là tạm tính của phần hàng thuộc phạm vi áp dụng.
 */
export function validateCoupon(
  coupon: CouponRule | null | undefined,
  eligibleSubtotalVnd: number,
  now: Date = new Date(),
  { hasEligiblePhysical = true }: { hasEligiblePhysical?: boolean } = {},
): { valid: boolean; error?: string } {
  if (!coupon) return { valid: false, error: 'Mã giảm giá không tồn tại.' };
  if (!coupon.active) return { valid: false, error: 'Mã giảm giá đã bị vô hiệu hoá.' };
  if (coupon.startsAt && now < coupon.startsAt)
    return { valid: false, error: 'Mã giảm giá chưa đến thời gian áp dụng.' };
  if (coupon.endsAt && now > coupon.endsAt)
    return { valid: false, error: 'Mã giảm giá đã hết hạn sử dụng.' };
  if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses)
    return { valid: false, error: 'Mã giảm giá đã hết lượt sử dụng.' };
  if (eligibleSubtotalVnd <= 0)
    return {
      valid: false,
      error:
        coupon.scope === 'CATEGORIES'
          ? 'Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng.'
          : 'Đơn hàng chưa có sản phẩm để áp dụng mã.',
    };
  if (coupon.minOrderVnd && eligibleSubtotalVnd < coupon.minOrderVnd)
    return {
      valid: false,
      error: `Mã giảm giá áp dụng cho đơn từ ${money(coupon.minOrderVnd)}${
        coupon.scope === 'CATEGORIES' ? ' (tính trên sản phẩm được áp dụng)' : ''
      }.`,
    };
  if (coupon.type === 'FREE_SHIP' && !hasEligiblePhysical)
    return { valid: false, error: 'Mã miễn phí ship chỉ dùng cho đơn có hàng cần giao hàng.' };
  return { valid: true };
}

function inScope(coupon: CouponRule, product: ProductPriceSnapshot) {
  if (coupon.scope !== 'CATEGORIES') return true;
  return Boolean(product.categoryId && coupon.categoryIds?.includes(product.categoryId));
}

/**
 * Tính tiền đơn hàng: tạm tính, giảm giá và tổng (chưa gồm ship).
 * - Tiền VND là số nguyên; giảm giá không vượt phần hàng hợp lệ; tổng không âm.
 * - Voucher theo danh mục chỉ giảm trên phần hàng thuộc danh mục đó.
 */
export function calculatePricing({
  items,
  productsMap,
  coupon,
  now = new Date(),
}: {
  items: CartItemInput[];
  /** Key = lineKey(productId, variantId) */
  productsMap: Map<string, ProductPriceSnapshot>;
  coupon?: CouponRule | null;
  now?: Date;
}): PricingResult {
  const pricingItems: PricingItem[] = [];
  let subtotalVnd = 0;
  let eligibleSubtotalVnd = 0;
  let hasEligiblePhysical = false;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.qty || 1));
    const product = productsMap.get(lineKey(item.productId, item.variantId));
    if (!product || product.status !== 'ACTIVE') continue;

    const unitPriceVnd = Math.max(0, Math.floor(product.priceVnd));
    const itemTotalVnd = unitPriceVnd * qty;
    subtotalVnd += itemTotalVnd;
    if (coupon && inScope(coupon, product)) {
      eligibleSubtotalVnd += itemTotalVnd;
      if (product.type === 'PHYSICAL') hasEligiblePhysical = true;
    }
    pricingItems.push({
      productId: item.productId,
      ...(item.variantId && { variantId: item.variantId }),
      qty,
      unitPriceVnd,
      itemTotalVnd,
    });
  }

  let discountVnd = 0;
  let couponApplied: CouponApplied | null = null;
  let couponError: string | undefined;

  if (coupon) {
    const validation = validateCoupon(coupon, eligibleSubtotalVnd, now, { hasEligiblePhysical });
    if (validation.valid) {
      if (coupon.type === 'PERCENT') {
        const percent = Math.min(100, Math.max(0, coupon.value));
        discountVnd = Math.round((eligibleSubtotalVnd * percent) / 100);
        if (coupon.maxDiscountVnd) discountVnd = Math.min(discountVnd, coupon.maxDiscountVnd);
      } else if (coupon.type === 'FIXED') {
        discountVnd = Math.max(0, coupon.value);
      }
      discountVnd = Math.min(discountVnd, eligibleSubtotalVnd);
      couponApplied = {
        code: coupon.code ?? '',
        type: coupon.type,
        value: coupon.value,
        discountVnd,
      };
    } else {
      couponError = validation.error;
    }
  }

  return {
    items: pricingItems,
    subtotalVnd,
    discountVnd,
    totalVnd: Math.max(0, subtotalVnd - discountVnd),
    couponApplied,
    couponError,
  };
}

/** Phần phí ship được voucher free ship miễn (0 nếu không phải voucher free ship). */
export function shippingDiscountFor(applied: CouponApplied | null, shippingFeeVnd: number) {
  if (!applied || applied.type !== 'FREE_SHIP' || shippingFeeVnd <= 0) return 0;
  return applied.value > 0 ? Math.min(shippingFeeVnd, applied.value) : shippingFeeVnd;
}
