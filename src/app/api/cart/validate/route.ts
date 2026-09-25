import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calculatePricing } from '@/lib/pricing';
import { buildPriceMap, loadCartProducts } from '@/lib/shop/cart-products';
import { lineKey, resolveCartLines } from '@/lib/shop/variants';

const validateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1).optional().nullable(),
      qty: z.number().int().positive().default(1),
    }),
  ),
  couponCode: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = validateCartSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Dữ liệu giỏ hàng không hợp lệ.' },
        { status: 400 },
      );
    }

    const { items, couponCode } = parseResult.data;

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          subtotalVnd: 0,
          discountVnd: 0,
          totalVnd: 0,
          couponApplied: null,
          errors: [],
        },
      });
    }

    // 1. Đọc sản phẩm + biến thể từ Database rồi chuẩn hóa dòng giỏ hàng
    const products = await loadCartProducts(items.map((i) => i.productId));
    const { lines, errors } = resolveCartLines(items, products);
    const productsMap = buildPriceMap(lines);

    // 2. Tìm coupon nếu có
    let coupon = null;
    if (couponCode && couponCode.trim() !== '') {
      coupon = await db.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
    }

    // 3. Tính toán giá tiền từ server
    const pricing = calculatePricing({
      items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
      productsMap,
      coupon,
    });

    // 4. Bổ sung thông tin hiển thị cho client
    const lineMap = new Map(lines.map((line) => [lineKey(line.productId, line.variantId), line]));
    const detailedItems = pricing.items.map((item) => {
      const line = lineMap.get(lineKey(item.productId, item.variantId));
      return {
        ...item,
        variantId: line?.variantId ?? '',
        variantName: line?.variant.name ?? '',
        type: line?.product.type ?? 'DOWNLOAD',
        hasMultipleVariants: (line?.product.variants.filter((v) => v.active).length ?? 0) > 1,
        stockLeft: line?.variant.stock ?? null,
        name: line?.product.name ?? 'Sản phẩm',
        slug: line?.product.slug ?? '',
        coverUrl: line?.product.coverUrl ?? '',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        items: detailedItems,
        subtotalVnd: pricing.subtotalVnd,
        discountVnd: pricing.discountVnd,
        totalVnd: pricing.totalVnd,
        couponApplied: pricing.couponApplied,
        couponError: pricing.couponError,
        errors: errors.map((error) => error.message),
      },
    });
  } catch (error) {
    console.error('❌ Lỗi xác thực giỏ hàng:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi tính giá giỏ hàng. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
