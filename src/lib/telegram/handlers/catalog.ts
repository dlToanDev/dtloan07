import { db } from '@/lib/db';
import { escapeHtml } from '../config';
import {
  formatVnd,
  productsListKeyboard,
  productDetailKeyboard,
  backToMenuKeyboard,
} from '../keyboards';
import type { Context } from 'grammy';

/**
 * Hiển thị danh sách sản phẩm theo danh mục (chỉ ACCOUNT và DOWNLOAD)
 */
export async function showCatalog(ctx: Context, category: 'ACCOUNT' | 'DOWNLOAD') {
  try {
    const products = await db.product.findMany({
      where: {
        type: category,
        status: 'ACTIVE',
      },
      include: {
        variants: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const categoryTitle =
      category === 'ACCOUNT' ? '🔐 <b>Tài Khoản Bản Quyền</b>' : '📁 <b>File Code & Dự Án Mẫu</b>';

    if (products.length === 0) {
      const emptyMsg =
        `${categoryTitle}\n\n` +
        `Hiện tại danh mục này đang cập nhật thêm sản phẩm mới.\n` +
        `Bạn vui lòng quay lại sau hoặc tham khảo các danh mục khác nhé!`;

      if (ctx.callbackQuery) {
        await ctx.editMessageText(emptyMsg, {
          parse_mode: 'HTML',
          reply_markup: backToMenuKeyboard(),
        });
      } else {
        await ctx.reply(emptyMsg, {
          parse_mode: 'HTML',
          reply_markup: backToMenuKeyboard(),
        });
      }
      return;
    }

    const items = await Promise.all(
      products.map(async (p) => {
        const prices = p.variants.map((v) => v.priceVnd);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

        let stockText = 'Có sẵn';
        if (p.type === 'ACCOUNT' && p.deliveryMode === 'AUTO') {
          const availableStock = await db.accountStock.count({
            where: {
              variantId: { in: p.variants.map((v) => v.id) },
              status: 'AVAILABLE',
            },
          });
          stockText = availableStock > 0 ? `Còn ${availableStock} kho` : 'Tạm hết';
        }

        return {
          id: p.id,
          name: p.name,
          minPrice,
          stockText,
        };
      }),
    );

    let text = `${categoryTitle}\n\n`;
    text += `Chọn sản phẩm bạn muốn xem chi tiết và mua hàng:\n\n`;

    items.forEach((item, index) => {
      text += `${index + 1}. <b>${escapeHtml(item.name)}</b>\n`;
      text += `   💰 Giá từ: <b>${formatVnd(item.minPrice)}</b> · 📦 <i>${item.stockText}</i>\n\n`;
    });

    const replyMarkup = productsListKeyboard(items);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    }
  } catch (error) {
    console.error('Lỗi khi tải danh mục sản phẩm Telegram:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi tải danh sách sản phẩm. Vui lòng thử lại sau.');
  }
}

/**
 * Hiển thị chi tiết 1 sản phẩm kèm biến thể và nút mua hàng
 */
export async function showProductDetail(ctx: Context, productId: string) {
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
        files: true,
      },
    });

    if (
      !product ||
      product.status !== 'ACTIVE' ||
      (product.type !== 'ACCOUNT' && product.type !== 'DOWNLOAD')
    ) {
      const notFoundMsg = '⚠️ Sản phẩm này không tồn tại hoặc đã ngừng kinh doanh.';
      if (ctx.callbackQuery) {
        await ctx.editMessageText(notFoundMsg, { reply_markup: backToMenuKeyboard() });
      } else {
        await ctx.reply(notFoundMsg, { reply_markup: backToMenuKeyboard() });
      }
      return;
    }

    // Kiểm tra tồn kho của từng biến thể
    const variantsWithStock = await Promise.all(
      product.variants.map(async (v) => {
        let isAvailable = true;
        let stockCount: number | null = null;

        if (product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO') {
          stockCount = await db.accountStock.count({
            where: { variantId: v.id, status: 'AVAILABLE' },
          });
          isAvailable = stockCount > 0;
        }

        return {
          id: v.id,
          name: v.name,
          priceVnd: v.priceVnd,
          isAvailable,
          stockCount,
        };
      }),
    );

    const chatId = ctx.chat?.id;
    let previousEmail: string | null = null;
    if (chatId) {
      const lastOrder = await db.order.findFirst({
        where: { telegramChatId: String(chatId) },
        orderBy: { createdAt: 'desc' },
        select: { email: true },
      });
      previousEmail = lastOrder?.email || null;
    }

    const typeBadge = product.type === 'ACCOUNT' ? '🔐 Tài Khoản Số' : '📁 Mã Nguồn / File Số';
    const deliveryNote =
      product.type === 'ACCOUNT'
        ? product.deliveryMode === 'AUTO'
          ? '⚡ <b>Tự động bàn giao trong 3 giây</b> sau khi thanh toán qua Telegram & Email'
          : '⏳ Bàn giao thủ công từ Quản trị viên trong vòng 1-2 giờ'
        : '⚡ <b>Tự động cấp mã bản quyền & link tải tốc độ cao Cloudflare R2</b>';

    let text = `📦 <b>${escapeHtml(product.name)}</b>\n`;
    text += `🏷️ Phân loại: <i>${typeBadge}</i>\n\n`;

    if (product.description) {
      // Lấy 300 ký tự đầu mô tả, loại bỏ các ký tự html lạ
      const cleanDesc = product.description
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 300);
      if (cleanDesc) {
        text += `📝 <b>Mô tả:</b>\n${escapeHtml(cleanDesc)}...\n\n`;
      }
    }

    text += `🚀 <b>Hình thức nhận hàng:</b>\n${deliveryNote}\n\n`;
    text += `📋 <b>Các gói / Biến thể:</b>\n`;

    for (const v of variantsWithStock) {
      const stockBadge =
        v.stockCount !== null ? (v.stockCount > 0 ? `(Còn ${v.stockCount})` : '(Hết hàng)') : '';
      text += `• <b>${escapeHtml(v.name)}</b>: <code>${formatVnd(v.priceVnd)}</code> ${stockBadge}\n`;
    }

    text += `\n👉 Bấm nút bên dưới để chọn gói và thanh toán qua PayOS VietQR Napas 24/7:`;

    const replyMarkup = productDetailKeyboard({
      productId: product.id,
      category: product.type as 'ACCOUNT' | 'DOWNLOAD',
      variants: variantsWithStock,
      previousEmail,
    });

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    }
  } catch (error) {
    console.error('Lỗi khi xem chi tiết sản phẩm Telegram:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi xem chi tiết sản phẩm.');
  }
}
