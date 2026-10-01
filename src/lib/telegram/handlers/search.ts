import { db } from '@/lib/db';
import { escapeHtml } from '../config';
import { formatVnd, productsListKeyboard, backToMenuKeyboard } from '../keyboards';
import { safeEditOrReply } from '../helpers';
import { handleCheckOrder } from './order';
import type { Context } from 'grammy';

/**
 * Hướng dẫn tìm kiếm khi gõ /find
 */
export async function handleSearchPrompt(ctx: Context) {
  const text =
    `🔍 <b>TÌM KIẾM SẢN PHẨM & ĐƠN HÀNG</b>\n\n` +
    `Bạn có thể tìm kiếm nhanh bằng cách gõ vào ô chat:\n\n` +
    `1️⃣ <b>Tìm sản phẩm:</b> Gõ tên sản phẩm bạn quan tâm.\n` +
    `   <i>(Ví dụ: <code>chatgpt</code>, <code>copilot</code>, <code>nextjs</code>, <code>source code</code>...)</i>\n\n` +
    `2️⃣ <b>Tra cứu đơn hàng:</b> Gõ mã đơn hàng dạng <code>DH-xxxxx</code> để xem trạng thái và lấy lại tài khoản / link tải code.\n\n` +
    `👉 Hãy gửi từ khóa bạn muốn tìm vào đây:`;

  await safeEditOrReply(ctx, text, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
}

/**
 * Thực hiện tìm kiếm sản phẩm hoặc mã đơn hàng
 */
export async function searchProductsOrOrders(ctx: Context, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  // Nếu là mã đơn hàng
  if (cleanQuery.toUpperCase().startsWith('DH-')) {
    await handleCheckOrder(ctx, cleanQuery.toUpperCase());
    return;
  }

  try {
    const products = await db.product.findMany({
      where: {
        status: 'ACTIVE',
        showOnTelegram: true,
        OR: [
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { description: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        variants: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      take: 8,
    });

    if (products.length === 0) {
      await ctx.reply(
        `🔍 Không tìm thấy sản phẩm nào khớp với từ khóa: <b>"${escapeHtml(cleanQuery)}"</b>.\n` +
          `Bạn vui lòng thử từ khóa khác hoặc bấm /product để xem tất cả sản phẩm nhé!`,
        { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() },
      );
      return;
    }

    const items = products.map((p) => {
      const prices = p.variants.map((v) => v.priceVnd);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      return {
        id: p.id,
        name: p.name,
        minPrice,
        stockText: p.type === 'ACCOUNT' ? 'Tài khoản' : 'File code',
      };
    });

    let text = `🔍 <b>KẾT QUẢ TÌM KIẾM CHO "${escapeHtml(cleanQuery)}"</b> (${items.length} sản phẩm):\n\n`;
    items.forEach((item, index) => {
      text += `${index + 1}. <b>${escapeHtml(item.name)}</b>\n`;
      text += `   💰 Giá từ: <b>${formatVnd(item.minPrice)}</b> · 📦 <i>${item.stockText}</i>\n\n`;
    });

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: productsListKeyboard(items),
    });
  } catch (error) {
    console.error('Lỗi searchProductsOrOrders:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra trong quá trình tìm kiếm.');
  }
}
