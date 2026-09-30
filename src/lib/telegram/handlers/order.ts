import { db } from '@/lib/db';
import crypto from 'crypto';
import { createPayOSPaymentLink } from '@/lib/payments/payos';
import { reserveAccountsForItem, releaseAccountsForOrder } from '@/lib/shop/account-stock';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { siteConfig } from '@/config/site';
import { escapeHtml } from '../config';
import {
  formatVnd,
  orderPaymentKeyboard,
  emailChoiceKeyboard,
  backToMenuKeyboard,
} from '../keyboards';
import type { Context } from 'grammy';

/**
 * Trạng thái tạm thời khi bot đang chờ user gõ email
 * Key: telegramChatId, Value: { variantId, expiresAt }
 */
export const userCheckoutState = new Map<number, { variantId: string; expiresAt: number }>();

/**
 * Khởi động luồng mua hàng cho 1 biến thể:
 * Kiểm tra xem user đã có email cũ hay chưa, nếu chưa thì xin email.
 */
export async function initiateCheckout(ctx: Context, variantId: string, specifiedEmail?: string) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // Nếu đã truyền email (từ nút bấm chọn email cũ)
    if (specifiedEmail) {
      await processOrderCreation(ctx, variantId, specifiedEmail);
      return;
    }

    // Kiểm tra xem khách đã từng mua hàng chưa
    const lastOrder = await db.order.findFirst({
      where: { telegramChatId: String(chatId) },
      orderBy: { createdAt: 'desc' },
      select: { email: true },
    });

    if (lastOrder?.email) {
      const text =
        `✉️ <b>Xác nhận Email nhận hàng</b>\n\n` +
        `Bạn muốn nhận hóa đơn và thông tin bản quyền qua email nào?\n\n` +
        `Hệ thống thấy bạn từng sử dụng: <code>${escapeHtml(lastOrder.email)}</code>\n` +
        `Bạn có thể chọn dùng lại email này hoặc nhập email mới:`;

      const markup = emailChoiceKeyboard(variantId, lastOrder.email);

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: markup });
      } else {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: markup });
      }
      return;
    }

    // Nếu là khách mới: lưu state và yêu cầu nhập email
    userCheckoutState.set(chatId, {
      variantId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 phút
    });

    const promptText =
      `✉️ <b>Nhập địa chỉ Email nhận hàng</b>\n\n` +
      `Vui lòng nhập địa chỉ Email của bạn vào ô chat bên dưới.\n` +
      `<i>(Ví dụ: <code>yourname@gmail.com</code>)</i>\n\n` +
      `📌 <b>Lưu ý:</b> Hệ thống sẽ gửi hóa đơn điện tử và link tải / thông tin tài khoản bảo hành đến email này.`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(promptText, {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
    } else {
      await ctx.reply(promptText, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
    }
  } catch (error) {
    console.error('Lỗi initiateCheckout:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi chuẩn bị đơn hàng.');
  }
}

/**
 * Xử lý tạo đơn hàng chính thức & sinh mã VietQR PayOS
 */
export async function processOrderCreation(ctx: Context, variantId: string, email: string) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const trimmedEmail = email.trim().toLowerCase();
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

    if (!variant || variant.product.status !== 'ACTIVE') {
      await ctx.reply('⚠️ Sản phẩm hoặc gói này hiện không còn khả dụng.', {
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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

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

    // 6. Tạo liên kết thanh toán PayOS
    const paymentResult = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: variant.priceVnd,
      description: formattedOrderCode,
    });

    // 7. Gửi thông tin đơn hàng và mã VietQR cho người dùng
    const caption =
      `🧾 <b>ĐƠN HÀNG MỚI ĐÃ KHỞI TẠO!</b>\n\n` +
      `📦 <b>Sản phẩm:</b> ${escapeHtml(product.name)}\n` +
      `🏷️ <b>Gói:</b> ${escapeHtml(variant.name)}\n` +
      `💰 <b>Số tiền cần thanh toán:</b> <code>${formatVnd(variant.priceVnd)}</code>\n` +
      `🔢 <b>Mã đơn hàng:</b> <code>${formattedOrderCode}</code>\n` +
      `✉️ <b>Email nhận hàng:</b> <code>${escapeHtml(trimmedEmail)}</code>\n` +
      `⏳ <b>Thời gian giữ chỗ:</b> 15 phút\n\n` +
      `👉 <b>Hướng dẫn thanh toán:</b>\n` +
      `1. Mở App Ngân hàng bất kỳ quét mã <b>VietQR</b> bên dưới.\n` +
      `2. Hoặc bấm nút <b>"Mở cổng thanh toán PayOS"</b> để thanh toán qua web.\n` +
      `3. Sau khi chuyển khoản xong, hệ thống Napas 24/7 sẽ tự động gửi hàng vào Telegram của bạn trong 3-5 giây!`;

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
      await ctx.reply('⚠️ Không tìm thấy đơn hàng.');
      return;
    }

    if (order.status !== 'PENDING') {
      await ctx.reply(`⚠️ Đơn hàng này đang ở trạng thái ${order.status}, không thể hủy.`);
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
    });

    const cancelMsg = `✅ Đã hủy đơn hàng <code>${orderCode}</code> thành công. Đã hoàn trả kho hàng.`;
    if (ctx.callbackQuery) {
      await ctx.editMessageText(cancelMsg, {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
    } else {
      await ctx.reply(cancelMsg, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
    }
  } catch (error) {
    console.error('Lỗi handleCancelOrder:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi hủy đơn hàng.');
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
      if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, { reply_markup: backToMenuKeyboard() });
      } else {
        await ctx.reply(msg, { reply_markup: backToMenuKeyboard() });
      }
      return;
    }

    let text = `📋 <b>LỊCH SỬ ĐƠN HÀNG GẦN ĐÂY:</b>\n\n`;

    for (const o of orders) {
      const statusIcon = o.status === 'PAID' ? '✅' : o.status === 'PENDING' ? '⏳' : '❌';
      text += `${statusIcon} <b>${o.orderCode}</b> · ${formatVnd(o.totalVnd)}\n`;
      text += `📅 Ngày tạo: ${new Date(o.createdAt).toLocaleString('vi-VN')}\n`;
      text += `Trạng thái: <b>${o.status}</b>\n`;
      for (const item of o.items) {
        text += `• ${escapeHtml(item.productNameSnapshot)} (${escapeHtml(item.variantNameSnapshot || '')})\n`;
      }
      text += `\n`;
    }

    text += `👉 Bấm /start để quay lại menu chính hoặc kiểm tra chi tiết đơn hàng bằng cách nhập mã đơn.`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
    }
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
