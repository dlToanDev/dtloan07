import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calculatePricing } from '@/lib/pricing';
import { buildPriceMap, loadCartProducts } from '@/lib/shop/cart-products';
import { resolveCartLines } from '@/lib/shop/variants';
import { quoteShipping, splitCartTotals, type CartLineType } from '@/lib/shop/shipping';
import { isValidProvince } from '@/config/provinces';

const quoteSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional().nullable(),
        qty: z.number().int().positive().default(1),
      }),
    )
    .max(100),
  province: z.string().trim().max(64),
  couponCode: z.string().optional().nullable(),
});

/**
 * Báo phí ship cho giỏ hàng hiện tại. Chỉ để hiển thị — `/api/checkout` luôn
 * tính lại phí từ đầu nên client không thể sửa số tiền.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = quoteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    const { items, province, couponCode } = parsed.data;
    if (!isValidProvince(province)) {
      return NextResponse.json({ error: 'Tỉnh/thành không hợp lệ.' }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        data: { feeVnd: 0, zoneName: null, freeShip: false, hasPhysical: false },
      });
    }

    const products = await loadCartProducts(items.map((item) => item.productId));
    const { lines } = resolveCartLines(items, products);
    const cartLines: CartLineType[] = lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      qty: line.qty,
      type: line.product.type,
    }));

    if (!cartLines.some((line) => line.type === 'PHYSICAL')) {
      return NextResponse.json({
        success: true,
        data: { feeVnd: 0, zoneName: null, freeShip: false, hasPhysical: false },
      });
    }

    let coupon = null;
    if (couponCode && couponCode.trim() !== '') {
      coupon = await db.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    }

    const pricing = calculatePricing({
      items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
      productsMap: buildPriceMap(lines),
      coupon,
    });

    const totals = splitCartTotals({
      lines: cartLines,
      pricingItems: pricing.items,
      discountVnd: pricing.discountVnd,
    });

    const zones = await db.shippingZone.findMany();
    const quote = quoteShipping({
      zones,
      provinceCode: province,
      physicalSubtotalVnd: totals.physicalAfterDiscountVnd,
    });

    return NextResponse.json({ success: true, data: { ...quote, hasPhysical: true } });
  } catch (error) {
    console.error('❌ Lỗi tính phí ship:', error);
    return NextResponse.json({ error: 'Không tính được phí vận chuyển.' }, { status: 500 });
  }
}
