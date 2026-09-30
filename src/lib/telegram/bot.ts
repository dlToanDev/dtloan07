import { Bot } from 'grammy';
import { getTelegramConfig, escapeHtml } from './config';
import { mainMenuKeyboard, backToMenuKeyboard } from './keyboards';
import { showCatalog, showProductDetail } from './handlers/catalog';
import {
  initiateCheckout,
  processOrderCreation,
  handleCheckOrder,
  handleCancelOrder,
  handleMyOrders,
  userCheckoutState,
} from './handlers/order';

const config = getTelegramConfig();
const botToken = config.token || '123456789:AAPlaceholderTokenForBuildCheckOnly123';

export const bot = new Bot(botToken);

// ==========================================
// 1. COMMANDS
// ==========================================

bot.command('start', async (ctx) => {
  const name = ctx.from?.first_name || 'bạn';
  const welcomeText =
    `👋 <b>Xin chào ${escapeHtml(name)}!</b>\n\n` +
    `Chào mừng bạn đến với Cửa Hàng <b>Mã Nguồn & Tài Khoản Bản Quyền</b>.\n\n` +
    `🚀 <b>Ưu điểm khi mua tại Bot:</b>\n` +
    `• Bàn giao tự động qua Telegram & Email trong <b>3 giây</b>\n` +
    `• Thanh toán tự động bằng mã <b>VietQR Napas 24/7</b>\n` +
    `• Bảo hành 1 đổi 1 uy tín\n\n` +
    `Vui lòng chọn danh mục bạn quan tâm:`;

  await ctx.reply(welcomeText, {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(),
  });
});

bot.command('help', async (ctx) => {
  const helpText =
    `📖 <b>HƯỚNG DẪN MUA HÀNG TRÊN TELEGRAM BOT:</b>\n\n` +
    `1️⃣ Chọn danh mục: 📁 <b>File Code</b> hoặc 🔐 <b>Tài Khoản</b>\n` +
    `2️⃣ Xem thông tin chi tiết và chọn gói phù hợp\n` +
    `3️⃣ Nhập Email nhận hóa đơn và thông tin bảo hành\n` +
    `4️⃣ Mở App Ngân hàng quét mã <b>VietQR</b> thanh toán tức thì\n` +
    `5️⃣ Hệ thống tự động bàn giao hàng ngay tại cuộc trò chuyện này!\n\n` +
    `📌 <b>Các lệnh nhanh:</b>\n` +
    `• /start - Mở menu chính\n` +
    `• /orders - Xem lại đơn hàng của bạn\n` +
    `• /help - Hướng dẫn sử dụng\n` +
    `• /cancel - Hủy thao tác đang làm dở`;

  await ctx.reply(helpText, {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(),
  });
});

bot.command('orders', async (ctx) => {
  await handleMyOrders(ctx);
});

bot.command('cancel', async (ctx) => {
  const chatId = ctx.chat.id;
  if (userCheckoutState.has(chatId)) {
    userCheckoutState.delete(chatId);
  }
  await ctx.reply('✅ Đã hủy thao tác hiện tại.', {
    reply_markup: mainMenuKeyboard(),
  });
});

// ==========================================
// 2. CALLBACK QUERIES
// ==========================================

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat?.id;

  try {
    if (data === 'nav:menu') {
      const name = ctx.from?.first_name || 'bạn';
      await ctx.editMessageText(
        `👋 Xin chào <b>${escapeHtml(name)}</b>! Vui lòng chọn danh mục bạn quan tâm:`,
        {
          parse_mode: 'HTML',
          reply_markup: mainMenuKeyboard(),
        },
      );
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === 'nav:orders') {
      await handleMyOrders(ctx);
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === 'nav:support') {
      const supportText =
        `💬 <b>HỖ TRỢ KỸ THUẬT & BẢO HÀNH</b>\n\n` +
        `• <b>Admin hỗ trợ:</b> @toan_developer\n` +
        `• <b>Thời gian hỗ trợ:</b> 8h00 - 23h00 hàng ngày\n` +
        `• <b>Chính sách bảo hành:</b> Cam kết 1 đổi 1 nếu tài khoản lỗi từ phía nhà cung cấp trong thời gian sử dụng.\n\n` +
        `Nếu bạn có bất kỳ câu hỏi nào về sản phẩm hoặc đơn hàng, đừng ngần ngại nhắn tin cho Admin nhé!`;

      await ctx.editMessageText(supportText, {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === 'cat:DOWNLOAD') {
      await showCatalog(ctx, 'DOWNLOAD');
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === 'cat:ACCOUNT') {
      await showCatalog(ctx, 'ACCOUNT');
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('prod:')) {
      const productId = data.replace('prod:', '');
      await showProductDetail(ctx, productId);
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('buy:')) {
      const variantId = data.replace('buy:', '');
      await initiateCheckout(ctx, variantId);
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('use_email:')) {
      // Format: use_email:<variantId>:<email>
      const parts = data.split(':');
      const variantId = parts[1];
      const email = parts.slice(2).join(':');
      if (variantId && email) {
        await processOrderCreation(ctx, variantId, email);
      }
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('ask_email:')) {
      const variantId = data.replace('ask_email:', '');
      if (chatId) {
        userCheckoutState.set(chatId, {
          variantId,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
      }
      await ctx.editMessageText(
        `✉️ <b>Nhập Email nhận hàng mới</b>\n\n` +
          `Vui lòng gõ địa chỉ email của bạn vào ô chat bên dưới:`,
        {
          parse_mode: 'HTML',
          reply_markup: backToMenuKeyboard(),
        },
      );
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('check:')) {
      const orderCode = data.replace('check:', '');
      await handleCheckOrder(ctx, orderCode);
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('cancel:')) {
      const orderCode = data.replace('cancel:', '');
      await handleCancelOrder(ctx, orderCode);
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === 'noop') {
      await ctx.answerCallbackQuery('Gói này hiện đang hết hàng trong kho.');
      return;
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Lỗi xử lý callback query:', err);
    await ctx.answerCallbackQuery('Có lỗi xảy ra, vui lòng thử lại.');
  }
});

// ==========================================
// 3. TEXT MESSAGES (Xử lý nhập Email hoặc mã đơn)
// ==========================================

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;

  // Nếu là lệnh (/...) thì bỏ qua vì grammY đã có bot.command
  if (text.startsWith('/')) return;

  // Kiểm tra xem user có đang ở trạng thái nhập Email hay không
  const pendingState = userCheckoutState.get(chatId);
  if (pendingState && pendingState.expiresAt > Date.now()) {
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      userCheckoutState.delete(chatId);
      await processOrderCreation(ctx, pendingState.variantId, email);
      return;
    } else {
      await ctx.reply(
        '⚠️ Email bạn vừa nhập không hợp lệ.\n' +
          'Vui lòng nhập lại đúng định dạng (Ví dụ: <code>yourname@gmail.com</code>):',
        { parse_mode: 'HTML' },
      );
      return;
    }
  }

  // Nếu user gõ mã đơn hàng dạng DH-xxxxxx để tra cứu
  if (text.toUpperCase().startsWith('DH-')) {
    await handleCheckOrder(ctx, text.toUpperCase());
    return;
  }

  // Trường hợp mặc định: Hướng dẫn người dùng
  await ctx.reply(
    `Xin chào <b>${escapeHtml(ctx.from?.first_name || 'bạn')}</b>!\n` +
      `Bấm nút bên dưới để khám phá kho tài khoản và mã nguồn của shop nhé:`,
    {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard(),
    },
  );
});
