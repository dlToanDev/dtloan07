import { Bot } from 'grammy';
import { getTelegramConfig, escapeHtml } from './config';
import {
  mainMenuKeyboard,
  categoryKeyboard,
  backToMenuKeyboard,
  persistentReplyKeyboard,
} from './keyboards';
import { showCatalog, showProductDetail } from './handlers/catalog';
import {
  initiateCheckout,
  processOrderCreation,
  handleCheckOrder,
  handleCancelOrder,
  handleMyOrders,
  userCheckoutState,
} from './handlers/order';
import { handleSearchPrompt, searchProductsOrOrders } from './handlers/search';

const config = getTelegramConfig();
const botToken = config.token || '123456789:AAPlaceholderTokenForBuildCheckOnly123';

export const bot = new Bot(botToken);

// ==========================================
// 0. GLOBAL ERROR HANDLER & REGISTER COMMANDS
// ==========================================

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ [TELEGRAM ERROR] Lỗi khi xử lý update ${ctx.update?.update_id}:`, err.error);
});

/**
 * Đăng ký danh sách lệnh Slash Commands với Telegram API
 * Sẽ hiển thị thành nút xanh [Menu] góc dưới bên trái ô chat trên ứng dụng Telegram
 */
export async function registerBotCommands() {
  if (!config.isConfigured) return;
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: '🏠 Khởi động bot & Menu chính' },
      { command: 'menu', description: '📂 Danh mục sản phẩm (Tài khoản & Code)' },
      { command: 'product', description: '📦 Danh sách tất cả sản phẩm' },
      { command: 'orders', description: '📋 Đơn hàng & Tra cứu của bạn' },
      { command: 'find', description: '🔍 Tìm kiếm sản phẩm hoặc mã đơn' },
      { command: 'support', description: '💬 Hỗ trợ kỹ thuật & bảo hành' },
    ]);
    console.log('✅ Đã đăng ký menu lệnh bot thành công với Telegram API!');
  } catch (err) {
    console.warn('Không thể đăng ký menu lệnh Telegram:', err);
  }
}

// ==========================================
// 1. COMMANDS (/start, /menu, /product, /orders, /find, /support)
// ==========================================

bot.command('start', async (ctx) => {
  try {
    const name = ctx.from?.first_name || 'bạn';
    const welcomeText =
      `👋 <b>Xin chào ${escapeHtml(name)}!</b>\n\n` +
      `Chào mừng bạn đến với Cửa Hàng <b>Mã Nguồn & Tài Khoản Bản Quyền</b>.\n\n` +
      `🚀 <b>Ưu điểm khi mua tại Bot:</b>\n` +
      `• Bàn giao tự động qua Telegram & Email trong <b>3 giây</b>\n` +
      `• Thanh toán quét mã <b>VietQR Napas 24/7</b> trực tiếp từng đơn (không cần nạp tiền)\n` +
      `• Tự động kiểm tra giao dịch và gửi mã bản quyền / link tải ngay\n` +
      `• Bảo hành 1 đổi 1 uy tín\n\n` +
      `Vui lòng bấm chọn các nút trên Menu bên dưới để bắt đầu:`;

    // Gửi kèm Persistent Reply Keyboard dưới thanh chat
    await ctx.reply(welcomeText, {
      parse_mode: 'HTML',
      reply_markup: persistentReplyKeyboard(),
    });

    // Gửi thêm menu inline card
    await ctx.reply('👉 Danh mục thao tác nhanh:', {
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /start:', error);
    try {
      await ctx.reply('👋 Xin chào bạn! Vui lòng chọn danh mục:', {
        reply_markup: categoryKeyboard(),
      });
    } catch {
      // Ignored
    }
  }
});

bot.command('menu', async (ctx) => {
  try {
    await ctx.reply('📂 <b>Chọn danh mục sản phẩm:</b>', {
      parse_mode: 'HTML',
      reply_markup: categoryKeyboard(),
    });
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /menu:', error);
  }
});

bot.command(['product', 'products'], async (ctx) => {
  try {
    await showCatalog(ctx, 'ACCOUNT');
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /product:', error);
  }
});

bot.command('wallet', async (ctx) => {
  try {
    await ctx.reply(
      `💡 <b>Thanh toán trực tiếp qua VietQR 24/7</b>\n\n` +
        `Bot áp dụng phương thức thanh toán chuyển khoản quét mã <b>VietQR Napas</b> trực tiếp theo từng đơn hàng (không cần nạp tiền tích lũy số dư ví).\n\n` +
        `👉 Bạn chỉ cần chọn sản phẩm mong muốn, bot sẽ tạo mã QR thanh toán chuẩn xác và tự động giao hàng sau 3 giây!`,
      {
        parse_mode: 'HTML',
        reply_markup: categoryKeyboard(),
      },
    );
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /wallet:', error);
  }
});

bot.command('find', async (ctx) => {
  try {
    await handleSearchPrompt(ctx);
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /find:', error);
  }
});

bot.command('support', async (ctx) => {
  try {
    const supportText =
      `💬 <b>HỖ TRỢ KỸ THUẬT & BẢO HÀNH</b>\n\n` +
      `• <b>Admin hỗ trợ:</b> @dltoan07\n` +
      `• <b>Thời gian hỗ trợ:</b> 8h00 - 23h00 hàng ngày\n` +
      `• <b>Chính sách bảo hành:</b> Cam kết 1 đổi 1 nếu tài khoản lỗi từ phía nhà cung cấp trong thời gian sử dụng.\n\n` +
      `Nếu bạn có bất kỳ câu hỏi nào về sản phẩm hoặc đơn hàng, đừng ngần ngại nhắn tin cho Admin nhé!`;

    await ctx.reply(supportText, {
      parse_mode: 'HTML',
      reply_markup: backToMenuKeyboard(),
    });
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /support:', error);
  }
});

bot.command('help', async (ctx) => {
  try {
    const helpText =
      `📖 <b>HƯỚNG DẪN MUA HÀNG TRÊN TELEGRAM BOT:</b>\n\n` +
      `1️⃣ Chọn danh mục: 📁 <b>File Code</b> hoặc 🔐 <b>Tài Khoản</b>\n` +
      `2️⃣ Xem thông tin chi tiết và chọn gói phù hợp\n` +
      `3️⃣ Nhập Email nhận hóa đơn và thông tin bảo hành\n` +
      `4️⃣ Mở App Ngân hàng quét mã <b>VietQR</b> thanh toán tức thì\n` +
      `5️⃣ Hệ thống tự động bàn giao hàng ngay tại cuộc trò chuyện này!\n\n` +
      `📌 <b>Các lệnh nhanh:</b>\n` +
      `• /start - Khởi động bot & Menu chính\n` +
      `• /menu - Danh mục sản phẩm\n` +
      `• /product - Danh sách sản phẩm\n` +
      `• /orders - Xem lại đơn hàng của bạn\n` +
      `• /find - Tìm kiếm sản phẩm hoặc tra cứu đơn\n` +
      `• /support - Hỗ trợ kỹ thuật\n` +
      `• /cancel - Hủy thao tác đang làm dở`;

    await ctx.reply(helpText, {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /help:', error);
  }
});

bot.command('orders', async (ctx) => {
  try {
    await handleMyOrders(ctx);
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /orders:', error);
  }
});

bot.command('cancel', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    if (userCheckoutState.has(chatId)) {
      userCheckoutState.delete(chatId);
    }
    await ctx.reply('✅ Đã hủy thao tác hiện tại.', {
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error('Lỗi khi xử lý lệnh /cancel:', error);
  }
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

    if (data === 'nav:find') {
      await handleSearchPrompt(ctx);
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === 'nav:support') {
      const supportText =
        `💬 <b>HỖ TRỢ KỸ THUẬT & BẢO HÀNH</b>\n\n` +
        `• <b>Admin hỗ trợ:</b> @dltoan07\n` +
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
// 3. TEXT MESSAGES (Menu cố định, Tìm kiếm, Email)
// ==========================================

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;

  // 1. Phím tắt từ Persistent Keyboard
  if (text === '📂 Sản phẩm') {
    await showCatalog(ctx, 'ACCOUNT');
    return;
  }

  if (text === '📋 Đơn hàng') {
    await handleMyOrders(ctx);
    return;
  }

  if (text === '🔍 Tìm kiếm') {
    await handleSearchPrompt(ctx);
    return;
  }

  if (text === '💬 Hỗ trợ') {
    await ctx.reply(
      `💬 <b>HỖ TRỢ KỸ THUẬT & BẢO HÀNH</b>\n\n` +
        `• <b>Admin hỗ trợ:</b> @dltoan07\n` +
        `• <b>Thời gian hỗ trợ:</b> 8h00 - 23h00 hàng ngày\n` +
        `• <b>Chính sách bảo hành:</b> Cam kết 1 đổi 1 nhanh chóng.`,
      { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() },
    );
    return;
  }

  if (text === '🏠 Menu chính') {
    await ctx.reply('👋 Danh mục thao tác chính:', {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  // Nếu là lệnh (/...) thì grammY command handler xử lý
  if (text.startsWith('/')) return;

  // 2. Kiểm tra xem user có đang ở trạng thái nhập Email hay không
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

  // 3. Tra cứu nhanh hoặc tìm kiếm sản phẩm theo từ khóa
  await searchProductsOrOrders(ctx, text);
});
