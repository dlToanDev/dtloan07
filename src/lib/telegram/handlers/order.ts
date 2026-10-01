import { db } from '@/lib/db';
import crypto from 'crypto';
import { createPayOSPaymentLink, cancelPayOSPaymentLink } from '@/lib/payments/payos';
import { reserveAccountsForItem, releaseAccountsForOrder } from '@/lib/shop/account-stock';
import { releaseOrderInventory } from '@/lib/shop/inventory';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { siteConfig } from '@/config/site';
import { escapeHtml } from '../config';
import { safeEditOrReply } from '../helpers';
import { formatVnd, orderPaymentKeyboard, backToMenuKeyboard } from '../keyboards';
import type { Context } from 'grammy';
import { paymentStatusLabel } from '@/lib/shop/labels';

/**
 * Trạng thái tạm thời khi bot đang chờ user gõ email
 * Key: telegramChatId, Value: { variantId, expiresAt }
 */
export const userCheckoutState = new Map<number, { variantId: string; expiresAt: number }>();

/**
 * Khởi động luồng mua hàng cho 1 biến thể:
 * Tự động tạo đơn hàng và hiển thị mã VietQR thanh toán ngay lập tức (không bắt nhập email).
 */
export async function initiateCheckout(ctx: Context, variantId: string, specifiedEmail?: string) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // Không cần hỏi email! Tự động tạo email định danh Telegram để khách quét mã QR thanh toán ngay lập tức
    const email =
      specifiedEmail ||
      (ctx.from?.username
        ? `${ctx.from.username.toLowerCase()}@telegram.org`
        : `tg_${chatId}@telegram.dltoan.me`);

    await processOrderCreation(ctx, variantId, email);
  } catch (error) {
    console.error('Lỗi initiateCheckout:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi chuẩn bị đơn hàng.');
  }
}

/**
 * Xử lý tạo đơn hàng chính thức & sinh mã VietQR PayOS
 */
export async function processOrderCreation(ctx: Context, variantId: string, email?: string) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    userCheckoutState.delete(chatId);

    const trimmedEmail =
      email && email.trim()
        ? email.trim().toLowerCase()
        : ctx.from?.username
          ? `${ctx.from.username.toLowerCase()}@telegram.org`
          : `tg_${chatId}@telegram.dltoan.me`;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      await ctx.reply('⚠️ Email không đúng định dạng. Vui lòng nhập lại email hợp lệ:');
      return;
    }

    // 1. Kiểm tra biến thể và sản phẩm
    const variant = await db.productVariant.findUnique({
      where: { id: variantId, active: true },
      include: { product: true },
    });

    if (
      !variant ||
      variant.product.status !== 'ACTIVE' ||
      variant.product.showOnTelegram === false
    ) {
      await ctx.reply('⚠️ Sản phẩm hoặc gói này hiện không còn khả dụng trên Telegram.', {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    const product = variant.product;
    if (product.type !== 'ACCOUNT' && product.type !== 'DOWNLOAD') {
      await ctx.reply('⚠️ Bot chỉ hỗ trợ bán sản phẩm số (Tài khoản và File Code).');
      return;
    }

    // 2. Chống spam / rate-limit: Tối đa 3 đơn PENDING cho mỗi Telegram user
    const pendingOrdersCount = await db.order.count({
      where: {
        telegramChatId: String(chatId),
        status: 'PENDING',
      },
    });

    if (pendingOrdersCount >= 3) {
      await ctx.reply(
        '⚠️ <b>Bạn đang có 3 đơn hàng đang chờ thanh toán!</b>\n\n' +
          'Để đảm bảo công bằng cho người mua khác, vui lòng thanh toán hoặc hủy bớt các đơn cũ trước khi tạo đơn mới nhé.\n' +
          'Bấm /orders để kiểm tra đơn hàng của bạn.',
        { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() },
      );
      return;
    }

    // 3. Kiểm tra kho đối với tài khoản AUTO
    if (product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO') {
      const availableStock = await db.accountStock.count({
        where: { variantId: variant.id, status: 'AVAILABLE' },
      });

      if (availableStock < 1) {
        await ctx.reply(
          `⚠️ Rất tiếc, gói <b>${escapeHtml(variant.name)}</b> của <b>${escapeHtml(product.name)}</b> vừa tạm hết tài khoản trong kho.\n` +
            `Vui lòng quay lại sau ít phút hoặc chọn gói khác nhé!`,
          { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() },
        );
        return;
      }
    }

    // 4. Sinh mã đơn hàng dạng số cho PayOS
    const randomSuffix = crypto.randomInt(10, 100);
    const numericOrderCode = Number(`${Math.floor(Date.now() / 1000)}${randomSuffix}`);
    const formattedOrderCode = `DH-${numericOrderCode}`;
    const ORDER_EXPIRY_MINUTES = 10; // Hạn thanh toán 10 phút thay vì 1-2 tiếng mặc định
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);

    const customerName =
      [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') ||
      ctx.from?.username ||
      trimmedEmail;

    // 5. Giao dịch Database: Tạo Order và Giữ chỗ kho tài khoản
    await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderCode: formattedOrderCode,
          email: trimmedEmail,
          customerName,
          subtotalVnd: variant.priceVnd,
          discountVnd: 0,
          totalVnd: variant.priceVnd,
          provider: 'PAYOS',
          paymentMethod: 'PAYOS',
          status: 'PENDING',
          fulfillmentStatus: product.type === 'ACCOUNT' ? 'PENDING' : null,
          source: 'TELEGRAM',
          telegramChatId: String(chatId),
          telegramUserId: ctx.from?.id ? String(ctx.from.id) : null,
          telegramUsername: ctx.from?.username || null,
          expiresAt,
          items: {
            create: [
              {
                productId: product.id,
                variantId: variant.id,
                productNameSnapshot: product.name,
                variantNameSnapshot: variant.name,
                productTypeSnapshot: product.type,
                unitPriceVnd: variant.priceVnd,
                qty: 1,
              },
            ],
          },
        },
        include: { items: true },
      });

      // Nếu là tài khoản tự động: giữ chỗ (RESERVED) bằng FOR UPDATE SKIP LOCKED
      if (product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO') {
        const orderItemId = newOrder.items[0]?.id;
        if (!orderItemId) {
          throw new Error('Không tạo được chi tiết đơn hàng.');
        }
        const reserveRes = await reserveAccountsForItem(tx, {
          variantId: variant.id,
          orderItemId,
          qty: 1,
          reservedUntil: expiresAt,
          label: `${product.name} – ${variant.name}`,
        });

        if (!reserveRes.ok) {
          throw new Error(reserveRes.error);
        }
      }

      return newOrder;
    });

    // 6. Tạo liên kết thanh toán PayOS (kèm thời hạn hết hạn 10 phút)
    const paymentResult = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: variant.priceVnd,
      description: formattedOrderCode,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
    });

    // 7. Gửi thông tin đơn hàng và mã VietQR cho người dùng
    const bankDetails =
      paymentResult.accountNumber && paymentResult.accountName
        ? `🏦 <b>THÔNG TIN CHUYỂN KHOẢN (Chạm để copy):</b>\n` +
          `• Ngân hàng: <b>${escapeHtml(paymentResult.bankName || 'MB Bank')}</b>\n` +
          `• Số tài khoản: <code>${escapeHtml(paymentResult.accountNumber)}</code>\n` +
          `• Chủ tài khoản: <b>${escapeHtml(paymentResult.accountName)}</b>\n` +
          `• Số tiền: <code>${paymentResult.amount || variant.priceVnd}</code>\n` +
          `• Nội dung CK: <code>${escapeHtml(paymentResult.description || formattedOrderCode)}</code>\n\n`
        : '';

    const caption =
      `🧾 <b>ĐƠN HÀNG MỚI ĐÃ KHỞI TẠO!</b>\n\n` +
      `📦 <b>Sản phẩm:</b> ${escapeHtml(product.name)}\n` +
      `🏷️ <b>Gói:</b> ${escapeHtml(variant.name)}\n` +
      `💰 <b>Cần thanh toán:</b> <code>${formatVnd(variant.priceVnd)}</code>\n` +
      `🔢 <b>Mã đơn:</b> <code>${formattedOrderCode}</code>\n` +
      `⏳ <b>Thời gian giữ chỗ:</b> ${ORDER_EXPIRY_MINUTES} phút\n\n` +
      bankDetails +
      `👉 <b>Thanh toán siêu tốc 24/7:</b>\n` +
      `1. Mở App Ngân hàng bất kỳ quét mã <b>VietQR</b> bên dưới hoặc chuyển đúng nội dung.\n` +
      `2. Hoặc bấm nút <b>"Mở cổng thanh toán PayOS"</b> để thanh toán qua web.\n` +
      `3. Sau khi chuyển khoản thành công, bot sẽ tự động gửi tài khoản / file tải ngay tại đây trong 3 giây!`;

    const keyboard = orderPaymentKeyboard(paymentResult.checkoutUrl, formattedOrderCode);

    if (paymentResult.qrImageUrl) {
      try {
        await ctx.replyWithPhoto(paymentResult.qrImageUrl, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        return;
      } catch (photoErr) {
        console.warn('Lỗi gửi ảnh QR, fallback sang gửi text:', photoErr);
      }
    }

    await ctx.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    console.error('Lỗi khi processOrderCreation:', error);
    await ctx.reply(`⚠️ Không thể tạo đơn hàng: ${message}. Vui lòng thử lại.`);
  }
}

/**
 * Kiểm tra trạng thái đơn hàng khi user bấm [🔄 Kiểm tra thanh toán]
 */
export async function handleCheckOrder(ctx: Context, orderCode: string) {
  try {
    const order = await db.order.findUnique({
      where: { orderCode },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      await ctx.reply('⚠️ Không tìm thấy thông tin đơn hàng này.');
      return;
    }

    if (order.status === 'PAID') {
      // Đơn đã thanh toán: render hàng bàn giao
      await renderDeliveryInfo(ctx, order.id);
      return;
    }

    if (order.status === 'EXPIRED' || order.status === 'FAILED' || order.cancelledAt) {
      const isExpired = order.status === 'EXPIRED';
      await ctx.reply(
        `❌ Đơn hàng <code>${orderCode}</code> đã bị <b>${isExpired ? 'HẾT HẠN' : 'HỦY'}</b>.\n` +
          `Kho đã được giải phóng. Bạn vui lòng tạo đơn mới nhé!`,
        { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() },
      );
      return;
    }

    // Đang chờ thanh toán
    await ctx.reply(
      `⏳ Đơn hàng <code>${orderCode}</code> đang ở trạng thái <b>CHỜ THANH TOÁN (PENDING)</b>.\n\n` +
        `• Số tiền: <b>${formatVnd(order.totalVnd)}</b>\n` +
        `• Nếu bạn đã chuyển khoản xong, vui lòng đợi 5-10 giây để ngân hàng Napas 24/7 đồng bộ dữ liệu.\n` +
        `• Ngay khi tiền vào tài khoản, bot sẽ gửi sản phẩm ngay lập tức tại đây!`,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    console.error('Lỗi handleCheckOrder:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi kiểm tra đơn hàng.');
  }
}

/**
 * Hủy đơn hàng PENDING khi user bấm [❌ Hủy đơn hàng]
 */
export async function handleCancelOrder(ctx: Context, orderCode: string) {
  try {
    const order = await db.order.findUnique({ where: { orderCode } });

    if (!order) {
      await safeEditOrReply(ctx, '⚠️ Không tìm thấy đơn hàng.', {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    if (order.status !== 'PENDING') {
      if (order.status === 'FAILED' || order.status === 'EXPIRED' || order.cancelledAt) {
        const statusLabel = order.status === 'EXPIRED' ? 'HẾT HẠN' : 'ĐÃ HỦY';
        await safeEditOrReply(
          ctx,
          `ℹ️ Đơn hàng <code>${orderCode}</code> đã ở trạng thái <b>${statusLabel}</b> trước đó. Đã giải phóng kho.`,
          {
            parse_mode: 'HTML',
            reply_markup: backToMenuKeyboard(),
          },
        );
        return;
      }
      await safeEditOrReply(
        ctx,
        `⚠️ Đơn hàng này đang ở trạng thái <b>${paymentStatusLabel(order.status)}</b>, không thể hủy.`,
        {
          parse_mode: 'HTML',
          reply_markup: backToMenuKeyboard(),
        },
      );
      return;
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          fulfillmentStatus: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
      await releaseAccountsForOrder(tx, order.id);
      await releaseOrderInventory(tx, order.id);
    });

    // Đồng bộ huỷ payment link trên PayOS (không chặn flow nếu PayOS báo lỗi)
    cancelPayOSPaymentLink(orderCode).catch((err) => {
      console.warn('Lỗi cancelPayOSPaymentLink:', err);
    });

    const cancelMsg = `✅ Đã hủy đơn hàng <code>${orderCode}</code> thành công. Đã hoàn trả kho hàng.`;
    await safeEditOrReply(ctx, cancelMsg, {
      parse_mode: 'HTML',
      reply_markup: backToMenuKeyboard(),
    });
  } catch (error) {
    console.error('Lỗi handleCancelOrder:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi hủy đơn hàng. Vui lòng liên hệ Admin để được hỗ trợ.');
  }
}

/**
 * Xem danh sách đơn hàng của người dùng (/orders)
 */
export async function handleMyOrders(ctx: Context) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const orders = await db.order.findMany({
      where: { telegramChatId: String(chatId) },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (orders.length === 0) {
      const msg =
        '🔍 Bạn chưa có đơn hàng nào tại cửa hàng.\nBấm nút bên dưới để xem các sản phẩm đang bán nhé:';
      await safeEditOrReply(ctx, msg, { reply_markup: backToMenuKeyboard() });
      return;
    }

    let text = `📋 <b>LỊCH SỬ ĐƠN HÀNG GẦN ĐÂY:</b>\n\n`;

    for (const o of orders) {
      const statusIcon = o.status === 'PAID' ? '✅' : o.status === 'PENDING' ? '⏳' : '❌';
      text += `${statusIcon} <b>${o.orderCode}</b> · ${formatVnd(o.totalVnd)}\n`;
      text += `📅 Ngày tạo: ${new Date(o.createdAt).toLocaleString('vi-VN')}\n`;
      text += `Trạng thái: <b>${paymentStatusLabel(o.status)}</b>\n`;
      for (const item of o.items) {
        text += `• ${escapeHtml(item.productNameSnapshot)} (${escapeHtml(item.variantNameSnapshot || '')})\n`;
      }
      text += `\n`;
    }

    text += `👉 Bấm /start để quay lại menu chính hoặc kiểm tra chi tiết đơn hàng bằng cách nhập mã đơn.`;

    await safeEditOrReply(ctx, text, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
  } catch (error) {
    console.error('Lỗi handleMyOrders:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi tải lịch sử đơn hàng.');
  }
}

/**
 * Hiển thị nội dung bàn giao (Tài khoản hoặc Link tải mã nguồn)
 */
export async function renderDeliveryInfo(ctx: Context, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          license: true,
        },
      },
    },
  });

  if (!order) return;

  let text = `🎉 <b>THANH TOÁN THÀNH CÔNG!</b>\n`;
  text += `Mã đơn: <code>${order.orderCode}</code> (Tổng tiền: ${formatVnd(order.totalVnd)})\n\n`;

  // 1. Kiểm tra tài khoản tự động đã bàn giao
  const deliveredAccounts = await db.accountStock.findMany({
    where: {
      orderItem: { orderId: order.id },
      status: 'DELIVERED',
    },
    include: {
      variant: { include: { product: true } },
    },
  });

  if (deliveredAccounts.length > 0) {
    text += `🔐 <b>THÔNG TIN TÀI KHOẢN BÀN GIAO:</b>\n`;
    for (const acc of deliveredAccounts) {
      let creds = 'Đã bàn giao';
      try {
        creds = decryptCredentials(acc.credentials);
      } catch {
        creds = '[Lỗi giải mã, vui lòng liên hệ admin]';
      }
      text += `\n📦 <b>${escapeHtml(acc.variant.product.name)}</b> (${escapeHtml(acc.variant.name)}):\n`;
      text += `<pre>${escapeHtml(creds)}</pre>\n`;
    }
    text += `\n⚠️ <i>Vui lòng đổi mật khẩu sau khi đăng nhập. Bảo hành 1 đổi 1 nếu lỗi từ nhà cung cấp.</i>\n\n`;
  }

  // 2. Kiểm tra hàng File tải về (Licenses)
  const licenses = order.items
    .map((i) => (i.license ? { ...i.license, productName: i.productNameSnapshot } : null))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  if (licenses.length > 0) {
    text += `📁 <b>BẢN QUYỀN MÃ NGUỒN & LINK TẢI:</b>\n`;
    for (const lic of licenses) {
      const downloadUrl = `${siteConfig.url}/api/download/${lic.id}?key=${lic.key}`;

      text += `\n📦 <b>${escapeHtml(lic.productName)}</b>\n`;
      text += `🔑 Mã bản quyền: <code>${lic.key}</code>\n`;
      text += `🔗 Link tải trực tiếp (Cloudflare R2):\n<a href="${downloadUrl}">${downloadUrl}</a>\n`;
      text += `<i>(Tối đa ${lic.maxDownloads} lượt tải)</i>\n`;
    }
    text += `\n`;
  }

  text += `✉️ Hóa đơn biên nhận đã được gửi đến email: <code>${escapeHtml(order.email)}</code>\n`;
  text += `Cảm ơn bạn đã tin tưởng ủng hộ shop! 🙏`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: backToMenuKeyboard(),
  });
}
