import { db } from '@/lib/db';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { siteConfig } from '@/config/site';
import { escapeHtml } from './config';
import { formatVnd, backToMenuKeyboard } from './keyboards';
import { bot } from './bot';

/**
 * Tự động gửi thông tin hàng số trực tiếp vào cuộc trò chuyện Telegram của khách
 * ngay khi PayOS Webhook xác nhận thanh toán thành công (3 giây).
 */
export async function sendTelegramOrderDelivery(orderId: string): Promise<boolean> {
  try {
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

    if (!order || !order.telegramChatId) {
      return false;
    }

    if (!bot) {
      console.warn('Telegram bot chưa được cấu hình token. Bỏ qua gửi tin nhắn giao hàng.');
      return false;
    }

    let text = `🎉 <b>THANH TOÁN THÀNH CÔNG!</b>\n`;
    text += `Mã đơn hàng: <code>${order.orderCode}</code>\n`;
    text += `Tổng thanh toán: <b>${formatVnd(order.totalVnd)}</b>\n\n`;

    // 1. Nếu đơn có tài khoản số tự động: Lấy danh sách tài khoản đã chuyển sang DELIVERED
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
      text += `🔐 <b>THÔNG TIN TÀI KHOẢN CỦA BẠN:</b>\n`;
      for (const acc of deliveredAccounts) {
        let creds = '';
        try {
          creds = decryptCredentials(acc.credentials);
        } catch {
          creds = '[Lỗi giải mã, vui lòng liên hệ admin]';
        }

        text += `\n📦 <b>${escapeHtml(acc.variant.product.name)}</b> (${escapeHtml(acc.variant.name)}):\n`;
        text += `<pre>${escapeHtml(creds)}</pre>\n`;
      }
      text += `\n⚠️ <i>Vui lòng đổi mật khẩu sau khi đăng nhập. Bảo hành 1 đổi 1 trong thời gian cam kết.</i>\n\n`;
    }

    // 2. Nếu đơn có file mã nguồn / tài liệu tải về (Licenses)
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

    text += `✉️ Hóa đơn chi tiết đã được gửi đến: <code>${escapeHtml(order.email)}</code>\n`;
    text += `Cảm ơn bạn đã tin tưởng ủng hộ cửa hàng! 🙏`;

    await bot.api.sendMessage(order.telegramChatId, text, {
      parse_mode: 'HTML',
      reply_markup: backToMenuKeyboard(),
    });

    console.log(
      `📱 [TELEGRAM DELIVERY] Đã bắn tin nhắn giao hàng thành công tới ChatId: ${order.telegramChatId}`,
    );
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi gửi tin nhắn giao hàng Telegram:', error);
    return false;
  }
}
