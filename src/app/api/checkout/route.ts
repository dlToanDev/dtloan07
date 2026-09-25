import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { calculatePricing } from '@/lib/pricing';
import { buildPriceMap, loadCartProducts } from '@/lib/shop/cart-products';
import { lineKey, resolveCartLines, type ResolvedCartLine } from '@/lib/shop/variants';
import { reserveVariantStock } from '@/lib/shop/inventory';
import {
  canUseCOD,
  quoteShipping,
  splitCartTotals,
  VN_PHONE_RE,
  type CartLineType,
} from '@/lib/shop/shipping';
import { isValidProvince } from '@/config/provinces';
import { createPayOSPaymentLink, generateLicenseKey } from '@/lib/payments/payos';
import { sendAdminNewOrderEmail, sendOrderLicenseEmail, sendOrderReceivedEmail } from '@/lib/mail';
import { siteConfig } from '@/config/site';

/** Đơn có giữ chỗ tồn kho phải thanh toán nhanh để không giam hàng của khách khác. */
const RESERVED_STOCK_TTL_MS = 30 * 60 * 1000;
const DIGITAL_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

const checkoutSchema = z.object({
  email: z.string().email('Địa chỉ email nhận hàng không hợp lệ.'),
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên người nhận.').max(120),
  phone: z.string().trim().regex(VN_PHONE_RE, 'Số điện thoại không hợp lệ (ví dụ 0912345678).'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional().nullable(),
        qty: z.number().int().positive().default(1),
      }),
    )
    .min(1, 'Giỏ hàng không được để trống.'),
  couponCode: z.string().optional().nullable(),
  paymentMethod: z.enum(['PAYOS', 'COD']).default('PAYOS'),
  shipping: z
    .object({
      province: z.string().trim().max(64).optional().default(''),
      address: z.string().trim().max(300).optional().default(''),
      note: z.string().trim().max(500).optional().default(''),
    })
    .optional(),
});

/** Dữ liệu OrderItem kèm snapshot biến thể và loại hàng tại thời điểm đặt. */
function orderItemData(
  item: { productId: string; variantId?: string; qty: number; unitPriceVnd: number },
  lineMap: Map<string, ResolvedCartLine>,
) {
  const line = lineMap.get(lineKey(item.productId, item.variantId));
  return {
    productId: item.productId,
    variantId: line?.variantId ?? null,
    variantNameSnapshot: line?.variant.name ?? null,
    productTypeSnapshot: line?.product.type ?? 'DOWNLOAD',
    qty: item.qty,
    unitPriceVnd: item.unitPriceVnd,
    productNameSnapshot: line?.product.name ?? 'Sản phẩm số',
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const json = await req.json().catch(() => ({}));
    const parseResult = checkoutSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Thông tin thanh toán không hợp lệ.' },
        { status: 400 },
      );
    }

    const { email, name, phone, items, couponCode, paymentMethod, shipping } = parseResult.data;
    const userId = session?.user?.id;

    // 1. Đọc sản phẩm + biến thể từ Database và chuẩn hóa dòng giỏ hàng
    const products = await loadCartProducts(items.map((i) => i.productId));
    const { lines, errors } = resolveCartLines(items, products);
    if (errors.length > 0 || lines.length === 0) {
      return NextResponse.json(
        { error: errors[0]?.message ?? 'Không tìm thấy sản phẩm hợp lệ trong giỏ hàng.' },
        { status: 400 },
      );
    }
    const productsMap = buildPriceMap(lines);
    const lineMap = new Map(lines.map((line) => [lineKey(line.productId, line.variantId), line]));
    const cartLines: CartLineType[] = lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      qty: line.qty,
      type: line.product.type,
    }));
    const hasPhysical = cartLines.some((line) => line.type === 'PHYSICAL');

    // 2. Luật giao hàng và thanh toán
    if (hasPhysical) {
      if (!isValidProvince(shipping?.province))
        return NextResponse.json({ error: 'Vui lòng chọn tỉnh/thành nhận hàng.' }, { status: 400 });
      if (!shipping?.address)
        return NextResponse.json({ error: 'Vui lòng nhập địa chỉ nhận hàng.' }, { status: 400 });
    }
    if (paymentMethod === 'COD' && !canUseCOD(cartLines)) {
      return NextResponse.json(
        { error: 'Thanh toán khi nhận hàng chỉ áp dụng cho đơn chỉ gồm hàng vật lý.' },
        { status: 400 },
      );
    }

    // 3. Coupon và giá tiền (server tự tính, không tin client)
    let coupon = null;
    if (couponCode && couponCode.trim() !== '') {
      coupon = await db.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    }

    const pricing = calculatePricing({
      items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
      productsMap,
      coupon,
    });

    if (pricing.items.length === 0) {
      return NextResponse.json(
        { error: 'Không có sản phẩm khả dụng để thanh toán.' },
        { status: 400 },
      );
    }

    // 4. Phí ship theo khu vực, tính trên tạm tính hàng vật lý sau giảm giá
    let shippingFeeVnd = 0;
    if (hasPhysical) {
      const zones = await db.shippingZone.findMany();
      const totals = splitCartTotals({
        lines: cartLines,
        pricingItems: pricing.items,
        discountVnd: pricing.discountVnd,
      });
      shippingFeeVnd = quoteShipping({
        zones,
        provinceCode: shipping?.province,
        physicalSubtotalVnd: totals.physicalAfterDiscountVnd,
      }).feeVnd;
    }

    const totalVnd = Math.max(0, pricing.totalVnd + shippingFeeVnd);

    // 5. Mã đơn cho PayOS (yêu cầu số nguyên dương)
    const numericOrderCode = Number(
      `${Math.floor(Date.now() / 1000)}${Math.floor(10 + Math.random() * 90)}`,
    );
    const formattedOrderCode = `DH-${numericOrderCode}`;

    const needsFulfillment = hasPhysical;
    const orderBase = {
      orderCode: formattedOrderCode,
      userId: userId || null,
      email,
      customerName: name,
      phone,
      subtotalVnd: pricing.subtotalVnd,
      discountVnd: pricing.discountVnd,
      shippingFeeVnd,
      totalVnd,
      couponId: coupon?.id || null,
      provider: 'PAYOS' as const,
      paymentMethod,
      fulfillmentStatus: needsFulfillment ? ('PENDING' as const) : null,
      shipProvince: hasPhysical ? (shipping?.province ?? null) : null,
      shipAddress: hasPhysical ? (shipping?.address ?? null) : null,
      shipNote: hasPhysical ? shipping?.note || null : null,
      items: { create: pricing.items.map((item) => orderItemData(item, lineMap)) },
    };

    const reserveLines = lines.map((line) => ({
      variantId: line.variantId,
      qty: line.qty,
      label: `${line.product.name} – ${line.variant.name}`,
    }));

    // 6. Đơn COD: không qua cổng thanh toán, chốt đơn ngay
    if (paymentMethod === 'COD') {
      const created = await db.$transaction(async (tx) => {
        const reserve = await reserveVariantStock(tx, reserveLines);
        if (!reserve.ok) throw new Error(`STOCK:${reserve.error}`);
        const order = await tx.order.create({
          data: { ...orderBase, status: 'PENDING', expiresAt: null },
        });
        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
        return order;
      });

      await sendOrderReceivedEmail({
        to: email,
        orderCode: formattedOrderCode,
        totalVnd,
        paymentMethod: 'COD',
      }).catch((e) => console.error('Lỗi gửi mail xác nhận đơn COD:', e));
      await sendAdminNewOrderEmail({
        orderCode: formattedOrderCode,
        totalVnd,
        customerName: name,
        phone,
        paymentMethod: 'COD',
      }).catch((e) => console.error('Lỗi gửi mail báo admin:', e));

      return NextResponse.json({
        success: true,
        orderCode: formattedOrderCode,
        orderId: created.id,
        checkoutUrl: `${siteConfig.url}/checkout/success?orderCode=${numericOrderCode}&cod=1`,
        isCOD: true,
      });
    }

    // 7. Đơn 0 đ (miễn phí hoặc giảm 100%): cấp license ngay
    if (totalVnd <= 0) {
      const order = await db.$transaction(async (tx) => {
        const reserve = await reserveVariantStock(tx, reserveLines);
        if (!reserve.ok) throw new Error(`STOCK:${reserve.error}`);

        const newOrder = await tx.order.create({
          data: {
            ...orderBase,
            status: 'PAID',
            paidAt: new Date(),
            fulfillmentStatus: needsFulfillment ? 'CONFIRMED' : null,
          },
          include: { items: true },
        });

        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        const licensesToDeliver = [];
        for (const orderItem of newOrder.items) {
          if (orderItem.productTypeSnapshot !== 'DOWNLOAD') continue;
          const maxDownloads =
            (
              await tx.product.findUnique({
                where: { id: orderItem.productId },
                select: { maxDownloads: true },
              })
            )?.maxDownloads ?? 5;
          const license = await tx.license.create({
            data: {
              key: generateLicenseKey(),
              userId: userId || null,
              email,
              orderItemId: orderItem.id,
              productId: orderItem.productId,
              maxDownloads,
            },
          });

          licensesToDeliver.push({
            productName: orderItem.productNameSnapshot,
            licenseKey: license.key,
            downloadUrl: `${siteConfig.url}/api/download/${license.id}`,
          });
        }

        return { newOrder, licensesToDeliver };
      });

      if (order.licensesToDeliver.length > 0) {
        await sendOrderLicenseEmail({
          to: email,
          orderCode: formattedOrderCode,
          licenses: order.licensesToDeliver,
        }).catch((e) => console.error('Lỗi gửi mail đơn hàng miễn phí:', e));
      }

      return NextResponse.json({
        success: true,
        orderCode: formattedOrderCode,
        checkoutUrl: `${siteConfig.url}/checkout/success?orderCode=${numericOrderCode}`,
        isFree: true,
      });
    }

    // 8. Đơn PayOS: giữ kho rồi tạo link thanh toán
    const { reservedCount } = await db.$transaction(async (tx) => {
      const reserve = await reserveVariantStock(tx, reserveLines);
      if (!reserve.ok) throw new Error(`STOCK:${reserve.error}`);
      // Đơn đang giam hàng thì hạn thanh toán ngắn, đơn chỉ có file giữ nguyên 24h.
      const ttl = reserve.reservedCount > 0 ? RESERVED_STOCK_TTL_MS : DIGITAL_ORDER_TTL_MS;
      await tx.order.create({
        data: {
          ...orderBase,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + ttl),
        },
      });
      return reserve;
    });

    const payosResult = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: totalVnd,
      description: formattedOrderCode,
      items: [
        ...pricing.items.map((item) => {
          const line = lineMap.get(lineKey(item.productId, item.variantId));
          return {
            name: (line?.product.name || 'Sản phẩm số').slice(0, 50),
            quantity: item.qty,
            price: item.unitPriceVnd,
          };
        }),
        ...(shippingFeeVnd > 0
          ? [{ name: 'Phí vận chuyển', quantity: 1, price: shippingFeeVnd }]
          : []),
      ],
    });

    if (hasPhysical) {
      await sendAdminNewOrderEmail({
        orderCode: formattedOrderCode,
        totalVnd,
        customerName: name,
        phone,
        paymentMethod: 'PAYOS',
      }).catch((e) => console.error('Lỗi gửi mail báo admin:', e));
    }

    return NextResponse.json({
      success: true,
      orderCode: formattedOrderCode,
      checkoutUrl: payosResult.checkoutUrl,
      qrCode: payosResult.qrCode,
      isMock: payosResult.isMock,
      reservedCount,
    });
  } catch (error) {
    // Lỗi hết hàng được ném ra từ transaction để rollback phần đã trừ kho.
    if (error instanceof Error && error.message.startsWith('STOCK:')) {
      return NextResponse.json({ error: error.message.slice(6) }, { status: 409 });
    }
    console.error('❌ Lỗi tạo đơn hàng thanh toán:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi khởi tạo thanh toán. Vui lòng thử lại sau.' },
      { status: 500 },
    );
  }
}
