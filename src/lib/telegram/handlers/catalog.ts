import { db } from '@/lib/db';
import { escapeHtml } from '../config';
import {
  formatVnd,
  productsListKeyboard,
  productDetailKeyboard,
  backToMenuKeyboard,
} from '../keyboards';
import { safeEditOrReply } from '../helpers';
import type { Context } from 'grammy';

/**
 * Hiển thị danh sách sản phẩm theo danh mục (VPS, VDS, ACCOUNT, DOWNLOAD)
 */
export async function showCatalog(ctx: Context, category: string) {
  try {
    let whereCondition: Record<string, unknown>;
    let categoryTitle: string;
    const backAction = 'nav:categories';

    const catUpper = category.toUpperCase();

    if (catUpper === 'VPS') {
      categoryTitle = '☁️ <b>Danh Mục Máy Chủ Cloud VPS</b>';
      whereCondition = {
        status: 'ACTIVE',
        showOnTelegram: true,
        OR: [
          { category: { slug: 'vps' } },
          { slug: { startsWith: 'cloud-vps' } },
          { name: { contains: 'VPS', mode: 'insensitive' } },
        ],
      };
    } else if (catUpper === 'VDS') {
      categoryTitle = '🖥️ <b>Danh Mục Máy Chủ Dedicated Cloud VDS</b>';
      whereCondition = {
        status: 'ACTIVE',
        showOnTelegram: true,
        OR: [
          { category: { slug: 'vds' } },
          { slug: { startsWith: 'cloud-vds' } },
          { name: { contains: 'VDS', mode: 'insensitive' } },
        ],
      };
    } else if (catUpper === 'DOWNLOAD') {
      categoryTitle = '📁 <b>File Code & Dự Án Mẫu</b>';
      whereCondition = {
        type: 'DOWNLOAD',
        status: 'ACTIVE',
        showOnTelegram: true,
      };
    } else {
      categoryTitle = '🔐 <b>Tài Khoản Bản Quyền & AI</b>';
      whereCondition = {
        type: 'ACCOUNT',
        status: 'ACTIVE',
        showOnTelegram: true,
        NOT: [
          { category: { slug: { in: ['vps', 'vds'] } } },
          { slug: { startsWith: 'cloud-vp' } },
          { slug: { startsWith: 'cloud-vd' } },
          { name: { contains: 'VPS', mode: 'insensitive' } },
          { name: { contains: 'VDS', mode: 'insensitive' } },
        ],
      };
    }

    const products = await db.product.findMany({
      where: whereCondition,
      include: {
        variants: {
          where: { active: true },
          orderBy: { priceVnd: 'asc' },
        },
      },
      orderBy: { priceVnd: 'asc' },
    });

    if (products.length === 0) {
      const emptyMsg =
        `${categoryTitle}\n\n` +
        `Hiện tại danh mục này đang cập nhật thêm sản phẩm mới.\n` +
        `Bạn vui lòng quay lại sau hoặc tham khảo các danh mục khác nhé!`;

      await safeEditOrReply(ctx, emptyMsg, {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    const items = await Promise.all(
      products.map(async (p) => {
        const prices = p.variants.map((v) => v.priceVnd);
        const minPrice = prices.length > 0 ? Math.min(...prices) : p.priceVnd || 0;

        let stockText = 'Có sẵn';
        if (p.deliveryMode === 'MANUAL') {
          stockText = 'Tự giao (Admin)';
        } else if (p.type === 'ACCOUNT' && p.deliveryMode === 'AUTO') {
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
    text += `Chọn gói sản phẩm bạn muốn xem chi tiết và mua hàng:\n\n`;

    items.forEach((item, index) => {
      text += `${index + 1}. <b>${escapeHtml(item.name)}</b>\n`;
      text += `   Giá từ: <b>${formatVnd(item.minPrice)}</b> · <i>${item.stockText}</i>\n\n`;
    });

    const replyMarkup = productsListKeyboard(items, backAction);

    await safeEditOrReply(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
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
        category: true,
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
      product.showOnTelegram === false ||
      (product.type !== 'ACCOUNT' && product.type !== 'DOWNLOAD')
    ) {
      const notFoundMsg = '⚠️ Sản phẩm này không tồn tại hoặc đã ngừng kinh doanh trên Telegram.';
      await safeEditOrReply(ctx, notFoundMsg, { reply_markup: backToMenuKeyboard() });
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

    const isVps =
      product.category?.slug === 'vps' ||
      product.slug.startsWith('cloud-vps') ||
      product.name.toLowerCase().includes('vps');
    const isVds =
      product.category?.slug === 'vds' ||
      product.slug.startsWith('cloud-vds') ||
      product.name.toLowerCase().includes('vds');

    const categoryKey = isVps ? 'VPS' : isVds ? 'VDS' : product.type;

    const typeBadge = isVps
      ? 'Máy Chủ Cloud VPS'
      : isVds
        ? 'Máy Chủ Cloud VDS'
        : product.type === 'ACCOUNT'
          ? 'Tài Khoản Số'
          : 'Mã Nguồn / File Số';

    const deliveryNote =
      product.deliveryMode === 'MANUAL'
        ? '<b>Liên hệ tôi tự giao:</b> Quản trị viên sẽ trực tiếp liên hệ gửi thông tin đăng nhập (IP, Root/SSH) qua Zalo/Telegram sau khi xác nhận đơn hàng.'
        : product.type === 'ACCOUNT'
          ? product.deliveryMode === 'AUTO'
            ? '<b>Tự động bàn giao trong 3 giây</b> sau khi thanh toán qua Telegram & Email'
            : 'Bàn giao thủ công từ Quản trị viên trong vòng 5-10 phút'
          : '<b>Tự động cấp mã bản quyền & link tải tốc độ cao Cloudflare R2</b>';

    let text = `<b>${escapeHtml(product.name)}</b>\n`;
    text += `Phân loại: <i>${typeBadge}</i>\n\n`;

    if (product.description) {
      // Lấy 300 ký tự đầu mô tả, loại bỏ các ký tự html lạ
      const cleanDesc = product.description
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 300);
      if (cleanDesc) {
        text += `<b>Mô tả:</b>\n${escapeHtml(cleanDesc)}...\n\n`;
      }
    }

    text += `<b>Hình thức nhận hàng:</b>\n${deliveryNote}\n\n`;
    text += `<b>Các gói / Cấu hình:</b>\n`;

    for (const v of variantsWithStock) {
      const stockBadge =
        v.stockCount !== null ? (v.stockCount > 0 ? `(Còn ${v.stockCount})` : '(Hết hàng)') : '';
      text += `• <b>${escapeHtml(v.name)}</b>: <code>${formatVnd(v.priceVnd)}</code> ${stockBadge}\n`;
    }

    text += `\nChọn gói bên dưới để thanh toán qua PayOS VietQR Napas 24/7:`;

    const replyMarkup = productDetailKeyboard({
      productId: product.id,
      category: categoryKey,
      variants: variantsWithStock,
      previousEmail,
    });

    await safeEditOrReply(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.error('Lỗi khi xem chi tiết sản phẩm Telegram:', error);
    await ctx.reply('⚠️ Có lỗi xảy ra khi xem chi tiết sản phẩm.');
  }
}
