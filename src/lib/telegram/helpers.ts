import type { Context } from 'grammy';
import type { InlineKeyboardMarkup } from 'grammy/types';

/**
 * Gửi hoặc cập nhật tin nhắn an toàn trong luồng Telegram Bot.
 * Khi tương tác qua callback query từ tin nhắn có chứa Media (ảnh VietQR code, video...),
 * API Telegram sẽ báo lỗi 400 nếu gọi `editMessageText`.
 * Hàm này tự động phát hiện media để xóa tin nhắn cũ và reply mới (hoặc sửa caption),
 * đồng thời dự phòng lỗi để đảm bảo không bao giờ crash flow của người dùng.
 */
export async function safeEditOrReply(
  ctx: Context,
  text: string,
  options?: Parameters<Context['reply']>[1],
) {
  if (ctx.callbackQuery) {
    const msg = ctx.callbackQuery.message;
    const isMedia =
      msg && ('photo' in msg || 'video' in msg || 'document' in msg || 'animation' in msg);

    // Chuẩn hóa inline_keyboard cho các API edit (chỉ chấp nhận InlineKeyboardMarkup)
    const inlineMarkup =
      options?.reply_markup && 'inline_keyboard' in options.reply_markup
        ? (options.reply_markup as InlineKeyboardMarkup)
        : undefined;

    if (isMedia) {
      try {
        await ctx.deleteMessage();
        return await ctx.reply(text, options);
      } catch {
        // Nếu không xóa được ảnh, thử cập nhật caption của ảnh
        try {
          return await ctx.editMessageCaption({
            caption: text,
            parse_mode: options?.parse_mode,
            reply_markup: inlineMarkup,
          });
        } catch {
          return await ctx.reply(text, options);
        }
      }
    }

    try {
      return await ctx.editMessageText(text, {
        parse_mode: options?.parse_mode,
        link_preview_options: options?.link_preview_options,
        reply_markup: inlineMarkup,
      });
    } catch {
      return await ctx.reply(text, options);
    }
  }

  return await ctx.reply(text, options);
}
