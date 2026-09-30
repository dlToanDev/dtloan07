import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { calculatePricing, shippingDiscountFor } from '@/lib/pricing';
import { CouponReserveError, findCouponByCode, reserveCoupon } from '@/lib/coupons';
import { isUserPro } from '@/lib/membership-db';
import { buildPriceMap, loadCartProducts } from '@/lib/shop/cart-products';
import { lineKey, resolveCartLines, type ResolvedCartLine } from '@/lib/shop/variants';
import { reserveVariantStock } from '@/lib/shop/inventory';
import { reserveAccountsForItem } from '@/lib/shop/account-stock';
import { isCredentialKeyConfigured } from '@/lib/crypto/credentials';
import { deliverAutoAccounts } from '@/lib/shop/account-delivery';
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
import { USD_TO_VND_RATE } from '@/lib/wallet';

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
  paymentMethod: z.enum(['PAYOS', 'COD', 'WALLET']).default('PAYOS'),
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
    if (!userId) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để thanh toán đơn hàng.' },
        { status: 401 },
      );
    }

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

    // Không bán tài khoản tự động khi chưa có khóa mã hóa — nếu không thì
    // không thể bàn giao và tiền của khách bị treo.
    const autoAccountLines = lines.filter(
      (line) => line.product.type === 'ACCOUNT' && line.product.deliveryMode === 'AUTO',
    );
    const autoAccountVariantIds = new Set(autoAccountLines.map((line) => line.variantId));
    if (autoAccountLines.length > 0 && !isCredentialKeyConfigured()) {
      return NextResponse.json(
        { error: 'Hệ thống chưa sẵn sàng bàn giao tài khoản. Vui lòng liên hệ người bán.' },
        { status: 503 },
      );
    }

    // 3. Voucher và giá tiền (server tự tính, không tin client)
    const lookup = couponCode?.trim()
      ? await findCouponByCode(couponCode, { userId, email })
      : null;
    if (lookup && !lookup.ok) return NextResponse.json({ error: lookup.error }, { status: 400 });
    const coupon = lookup?.ok ? lookup.coupon : null;

    const pricing = calculatePricing({
      items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
      productsMap,
      coupon: coupon?.rule,
    });
    // Mã khách nhập mà không dùng được thì báo lại, không lặng lẽ bỏ qua.
    if (coupon && !pricing.couponApplied)
      return NextResponse.json(
        { error: pricing.couponError ?? 'Mã giảm giá không dùng được cho đơn này.' },
        { status: 400 },
      );

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
    // Voucher free ship: shippingFeeVnd lưu phần khách trả, phần được miễn lưu riêng.
    // Tài khoản Pro luôn được miễn ship; không thì xét voucher free ship.
    const proFreeShip = hasPhysical && (await isUserPro(userId));
    const voucherShipDiscountVnd = proFreeShip
      ? 0
      : shippingDiscountFor(pricing.couponApplied, shippingFeeVnd);
    const shippingDiscountVnd = proFreeShip ? shippingFeeVnd : voucherShipDiscountVnd;
    shippingFeeVnd -= shippingDiscountVnd;

    const totalVnd = Math.max(0, pricing.totalVnd + shippingFeeVnd);

    // 5. Mã đơn cho PayOS (yêu cầu số nguyên dương)
    const randomSuffix = crypto.randomInt(10, 100);
    const numericOrderCode = Number(`${Math.floor(Date.now() / 1000)}${randomSuffix}`);
    const formattedOrderCode = `DH-${numericOrderCode}`;

    const hasAccount = cartLines.some((line) => line.type === 'ACCOUNT');
    const needsFulfillment = hasPhysical || hasAccount;
    const orderBase = {
      orderCode: formattedOrderCode,
      userId: userId || null,
      email,
      customerName: name,
      phone,
      subtotalVnd: pricing.subtotalVnd,
      discountVnd: pricing.discountVnd,
      shippingFeeVnd,
      shippingDiscountVnd,
      totalVnd,
      couponId: coupon?.couponId ?? null,
      provider: 'PAYOS' as const,
      paymentMethod,
      fulfillmentStatus: needsFulfillment ? ('PENDING' as const) : null,
      shipProvince: hasPhysical ? (shipping?.province ?? null) : null,
      shipAddress: hasPhysical ? (shipping?.address ?? null) : null,
      shipNote: hasPhysical ? shipping?.note || null : null,
      items: { create: pricing.items.map((item) => orderItemData(item, lineMap)) },
    };

    const reserveLines = lines
      // Tài khoản tự động giữ chỗ theo dòng kho, không trừ cột stock.
      .filter((line) => !autoAccountVariantIds.has(line.variantId))
      .map((line) => ({
        variantId: line.variantId,
        qty: line.qty,
        label: `${line.product.name} – ${line.variant.name}`,
      }));

    /** Giữ một lượt voucher cho đơn vừa tạo (cùng transaction với giữ kho). */
    async function reserveOrderCoupon(tx: Prisma.TransactionClient, orderId: string) {
      if (!coupon) return;
      await reserveCoupon(tx, {
        coupon,
        orderId,
        userId: userId ?? null,
        email,
        discountVnd: pricing.discountVnd + voucherShipDiscountVnd,
      });
    }

    /** Giữ chỗ tài khoản cho từng OrderItem sau khi đơn đã có id. */
    async function reserveOrderAccounts(
      tx: Prisma.TransactionClient,
      orderId: string,
      reservedUntil: Date | null,
    ) {
      if (autoAccountVariantIds.size === 0) return;
      const items = await tx.orderItem.findMany({
        where: { orderId, productTypeSnapshot: 'ACCOUNT' },
        select: {
          id: true,
          variantId: true,
          qty: true,
          productNameSnapshot: true,
          variantNameSnapshot: true,
        },
      });

      for (const item of items) {
        if (!item.variantId || !autoAccountVariantIds.has(item.variantId)) continue;
        const result = await reserveAccountsForItem(tx, {
          variantId: item.variantId,
          orderItemId: item.id,
          qty: item.qty,
          reservedUntil,
          label: item.variantNameSnapshot
            ? `${item.productNameSnapshot} – ${item.variantNameSnapshot}`
            : item.productNameSnapshot,
        });
        if (!result.ok) throw new Error(`STOCK:${result.error}`);
      }
    }

    // 6. Đơn COD: không qua cổng thanh toán, chốt đơn ngay
    if (paymentMethod === 'COD') {
      const created = await db.$transaction(async (tx) => {
        const reserve = await reserveVariantStock(tx, reserveLines);
        if (!reserve.ok) throw new Error(`STOCK:${reserve.error}`);
        const order = await tx.order.create({
          data: { ...orderBase, status: 'PENDING', expiresAt: null },
        });
        await reserveOrderCoupon(tx, order.id);
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

    // 6.1. Đơn thanh toán bằng Số dư Ví tài khoản: trừ tiền ví và hoàn tất đơn ngay lập tức
    if (paymentMethod === 'WALLET') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Vui lòng đăng nhập để thanh toán bằng số dư ví tài khoản.' },
          { status: 401 },
        );
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, balanceVnd: true, balanceUsd: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Không tìm thấy tài khoản người dùng.' },
          { status: 404 },
        );
      }

      const totalAvailableVnd = user.balanceVnd + Math.round(user.balanceUsd * USD_TO_VND_RATE);
      if (totalAvailableVnd < totalVnd) {
        return NextResponse.json(
          {
            error: `Số dư ví không đủ. Đơn hàng cần ${totalVnd.toLocaleString('vi-VN')} đ (Số dư khả dụng: ${totalAvailableVnd.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền hoặc chọn thanh toán PayOS.`,
          },
          { status: 400 },
        );
      }

      const order = await db.$transaction(async (tx) => {
        // Trừ tiền ví: ưu tiên trừ VND trước, thiếu trừ tiếp vào USD
        let newBalanceVnd = user.balanceVnd;
        let newBalanceUsd = user.balanceUsd;
        const currencyDeducted: 'VND' | 'USD' = 'VND';
        const amountDeducted = totalVnd;

        if (user.balanceVnd >= totalVnd) {
          newBalanceVnd = user.balanceVnd - totalVnd;
        } else {
          const remainingVnd = totalVnd - user.balanceVnd;
          const usdToDeduct = Number((remainingVnd / USD_TO_VND_RATE).toFixed(2));
          newBalanceVnd = 0;
          newBalanceUsd = Number((user.balanceUsd - usdToDeduct).toFixed(2));
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            balanceVnd: newBalanceVnd,
            balanceUsd: newBalanceUsd,
          },
        });

        // Giữ tồn kho biến thể
        const reserve = await reserveVariantStock(tx, reserveLines);
        if (!reserve.ok) throw new Error(`STOCK:${reserve.error}`);

        // Tạo Order trạng thái PAID
        const newOrder = await tx.order.create({
          data: {
            ...orderBase,
            provider: 'WALLET',
            paymentMethod: 'WALLET',
            status: 'PAID',
            paidAt: new Date(),
            fulfillmentStatus: needsFulfillment ? 'CONFIRMED' : null,
          },
          include: { items: true },
        });

        await reserveOrderAccounts(tx, newOrder.id, null);
        await reserveOrderCoupon(tx, newOrder.id);

        // Tạo Payment
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            providerEventId: `wallet-order-${formattedOrderCode}`,
            amountVnd: totalVnd,
            signatureValid: true,
            rawPayload: { provider: 'WALLET' },
          },
        });

        // Tạo biến động số dư WalletTransaction
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'PAYMENT',
            amount: amountDeducted,
            currency: currencyDeducted,
            balanceBefore: user.balanceVnd,
            balanceAfter: newBalanceVnd,
            status: 'COMPLETED',
            orderCode: formattedOrderCode,
            description: `Thanh toán đơn hàng ${formattedOrderCode} bằng Ví tài khoản`,
          },
        });

        // Cấp License cho hàng DOWNLOAD
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
        }).catch((e) => console.error('Lỗi gửi mail license đơn hàng ví:', e));
      }

      if (autoAccountVariantIds.size > 0) {
        await deliverAutoAccounts({
          id: order.newOrder.id,
          orderCode: formattedOrderCode,
          email,
          userId,
        }).catch((e) => console.error('Lỗi bàn giao tài khoản đơn ví:', e));
      }

      if (hasPhysical) {
        await sendAdminNewOrderEmail({
          orderCode: formattedOrderCode,
          totalVnd,
          customerName: name,
          phone,
          paymentMethod: 'WALLET',
        }).catch((e) => console.error('Lỗi gửi mail báo admin:', e));
      }

      return NextResponse.json({
        success: true,
        orderCode: formattedOrderCode,
        checkoutUrl: `${siteConfig.url}/checkout/success?orderCode=${numericOrderCode}&wallet=1`,
        isWallet: true,
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

        await reserveOrderAccounts(tx, newOrder.id, null);
        await reserveOrderCoupon(tx, newOrder.id);

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

      // Đơn 0 đ đã "thanh toán" nên bàn giao tài khoản tự động ngay.
      if (autoAccountVariantIds.size > 0) {
        await deliverAutoAccounts({
          id: order.newOrder.id,
          orderCode: formattedOrderCode,
          email,
          userId,
        }).catch((e) => console.error('Lỗi bàn giao tài khoản đơn miễn phí:', e));
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
      const holdsStock = reserve.reservedCount > 0 || autoAccountVariantIds.size > 0;
      const ttl = holdsStock ? RESERVED_STOCK_TTL_MS : DIGITAL_ORDER_TTL_MS;
      const expiresAt = new Date(Date.now() + ttl);
      const order = await tx.order.create({
        data: {
          ...orderBase,
          status: 'PENDING',
          expiresAt,
        },
      });
      await reserveOrderAccounts(tx, order.id, expiresAt);
      await reserveOrderCoupon(tx, order.id);
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
    if (error instanceof CouponReserveError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('❌ Lỗi tạo đơn hàng thanh toán:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi khởi tạo thanh toán. Vui lòng thử lại sau.' },
      { status: 500 },
    );
  }
}
