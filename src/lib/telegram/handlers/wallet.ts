import { db } from '@/lib/db';
import crypto from 'crypto';
import { createPayOSPaymentLink } from '@/lib/payments/payos';
import { escapeHtml } from '../config';
import { formatVnd, orderPaymentKeyboard, backToMenuKeyboard } from '../keyboards';
import { InlineKeyboard, type Context } from 'grammy';

/**
 * Bàn phím chọn các mệnh giá nạp tiền vào ví
 */
export function walletDepositKeyboard(userId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('💵 +50.000 đ', `deposit:50000:${userId}`)
    .text('💵 +100.000 đ', `deposit:100000:${userId}`)
    .row()
    .text('💵 +200.000 đ', `deposit:200000:${userId}`)
    .text('💵 +500.000 đ', `deposit:500000:${userId}`)
    .row()
    .text('🔙 Quay lại Menu', 'nav:menu');
}

/**
 * Xử lý lệnh /wallet: Hiển thị số dư ví và menu nạp tiền
 */
export async function handleWallet(ctx: Context) {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // Tìm đơn hàng gần nhất của Telegram user để lấy Email / userId liên kết
    const lastOrder = await db.order.findFirst({
      where: { telegramChatId: String(chatId) },
      orderBy: { createdAt: 'desc' },
      select: { email: true, userId: true },
    });

    let user = null;
    if (lastOrder?.userId) {
      user = await db.user.findUnique({
        where: { id: lastOrder.userId },
        select: { id: true, email: true, name: true, balanceVnd: true, balanceUsd: true },
      });
    }

    if (!user && lastOrder?.email) {
      user = await db.user.findUnique({
        where: { email: lastOrder.email },
        select: { id: true, email: true, name: true, balanceVnd: true, balanceUsd: true },
      });
    }

    if (!user) {
      const unlinkedText =
        `💰 <b>VÍ TIỀN ĐIỆN TỬ (DIGITAL WALLET)</b>\n\n` +
        `Bạn chưa liên kết tài khoản ví với Telegram này.\n\n` +
        `💡 <i>Để liên kết ví:</i>\n` +
        `1. Mua 1 đơn hàng bất kỳ hoặc nhập địa chỉ Email tài khoản web của bạn vào đây.\n` +
        `2. Số dư ví VND và USD sẽ được tự động đồng bộ ngay lập tức!`;

      if (ctx.callbackQuery) {
        await ctx.editMessageText(unlinkedText, {
          parse_mode: 'HTML',
          reply_markup: backToMenuKeyboard(),
        });
      } else {
        await ctx.reply(unlinkedText, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
      }
      return;
    }

    const text =
      `💰 <b>VÍ TIỀN ĐIỆN TỬ CỦA BẠN</b>\n\n` +
      `👤 Chủ tài khoản: <b>${escapeHtml(user.name || user.email)}</b>\n` +
      `✉️ Email: <code>${escapeHtml(user.email)}</code>\n\n` +
      `💵 <b>Số dư khả dụng:</b>\n` +
      `• VND: <code>${formatVnd(user.balanceVnd)}</code>\n` +
      `• USD: <code>$${user.balanceUsd.toFixed(2)}</code>\n\n` +
      `👉 <b>Nạp tiền vào ví qua VietQR Napas 24/7:</b>\n` +
      `Chọn nhanh số tiền bạn muốn nạp bên dưới:`;

    const markup = walletDepositKeyboard(user.id);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: markup });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: markup });
    }
  } catch (error) {
    console.error('Lỗi handleWallet:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi kiểm tra số dư ví.');
  }
}

/**
 * Xử lý nạp tiền vào ví qua VietQR PayOS
 */
export async function handleDeposit(ctx: Context, amountVnd: number, userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      await ctx.reply('⚠️ Không tìm thấy thông tin tài khoản người dùng.');
      return;
    }

    const randomSuffix = crypto.randomInt(10, 100);
    const numericOrderCode = Number(`${Math.floor(Date.now() / 1000)}${randomSuffix}`);
    const formattedOrderCode = `DH-${numericOrderCode}`;

    // Tạo đơn nạp tiền trong bảng Order
    await db.order.create({
      data: {
        orderCode: formattedOrderCode,
        userId: user.id,
        email: user.email,
        customerName: user.name || user.email,
        subtotalVnd: amountVnd,
        discountVnd: 0,
        totalVnd: amountVnd,
        depositCurrency: 'VND',
        depositAmount: amountVnd,
        provider: 'PAYOS',
        paymentMethod: 'PAYOS',
        status: 'PENDING',
        source: 'TELEGRAM',
        telegramChatId: ctx.chat ? String(ctx.chat.id) : null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Tạo payment link PayOS
    const paymentResult = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: amountVnd,
      description: formattedOrderCode,
    });

    const caption =
      `💳 <b>NẠP TIỀN VÀO VÍ ĐIỆN TỬ</b>\n\n` +
      `💰 Số tiền nạp: <b>${formatVnd(amountVnd)}</b>\n` +
      `🔢 Mã giao dịch: <code>${formattedOrderCode}</code>\n` +
      `✉️ Tài khoản nhận: <code>${escapeHtml(user.email)}</code>\n\n` +
      `👉 Quét mã <b>VietQR</b> bên dưới để nạp tiền tự động 24/7.\n` +
      `Ngay khi giao dịch hoàn tất, số dư sẽ được cộng vào ví của bạn trong 3 giây!`;

    const keyboard = orderPaymentKeyboard(paymentResult.checkoutUrl, formattedOrderCode);

    if (paymentResult.qrImageUrl) {
      try {
        await ctx.replyWithPhoto(paymentResult.qrImageUrl, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        return;
      } catch {
        // Fallback sang gửi tin nhắn thường
      }
    }

    await ctx.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Lỗi handleDeposit:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi tạo giao dịch nạp tiền.');
  }
}
