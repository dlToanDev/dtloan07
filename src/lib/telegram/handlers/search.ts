import { db } from '@/lib/db';
import { escapeHtml } from '../config';
import {
  formatVnd,
  productsListKeyboard,
  backToMenuKeyboard,
  categoryKeyboard,
} from '../keyboards';
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
    `   <i>(Ví dụ: <code>VPS</code>, <code>VDS</code>, <code>NextJS</code>, <code>Source code</code>...)</i>\n\n` +
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

  // Lọc ký tự emoji để tránh lỗi PostgreSQL collation với ILIKE
  const textQuery = cleanQuery
    .replace(/[^\p{L}\p{N}\s_.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!textQuery || textQuery.length < 2) {
    await ctx.reply(
      '🔍 Vui lòng nhập từ khóa tìm kiếm (Ví dụ: <code>VPS</code>, <code>VDS</code>, <code>Source code</code>...):',
      { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() },
    );
    return;
  }

  try {
    const products = await db.product.findMany({
      where: {
        status: 'ACTIVE',
        showOnTelegram: true,
        OR: [
          { name: { contains: textQuery, mode: 'insensitive' } },
          { description: { contains: textQuery, mode: 'insensitive' } },
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
        `🔍 Không tìm thấy sản phẩm nào khớp với từ khóa: <b>"${escapeHtml(textQuery)}"</b>.\n` +
          `Bạn vui lòng thử từ khóa khác hoặc bấm danh mục bên dưới nhé!`,
        { parse_mode: 'HTML', reply_markup: categoryKeyboard() },
      );
      return;
    }

    const items = products.map((p) => {
      const prices = p.variants.map((v) => v.priceVnd);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      let stockText = 'Sản phẩm';
      if (p.type === 'ACCOUNT') stockText = 'Tài khoản';
      else if (p.type === 'DOWNLOAD') stockText = 'File code';
      else if (p.name.toUpperCase().includes('VPS') || p.slug.includes('vps'))
        stockText = 'Cloud VPS';
      else if (p.name.toUpperCase().includes('VDS') || p.slug.includes('vds'))
        stockText = 'Cloud VDS';

      return {
        id: p.id,
        name: p.name,
        minPrice,
        stockText,
      };
    });

    let text = `🔍 <b>KẾT QUẢ TÌM KIẾM CHO "${escapeHtml(textQuery)}"</b> (${items.length} sản phẩm):\n\n`;
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
    await ctx.reply(
      '⚠️ Không thể tìm kiếm lúc này. Vui lòng bấm vào danh mục bên dưới để chọn sản phẩm:',
      { reply_markup: categoryKeyboard() },
    );
  }
}
