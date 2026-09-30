/**
 * Script chạy Telegram Bot ở chế độ Long Polling trên máy Local Development.
 * Chạy lệnh: pnpm telegram:dev
 */
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env not found or already loaded
  }
}

import { bot } from '../src/lib/telegram/bot';
import { getTelegramConfig } from '../src/lib/telegram/config';

const { token, username, isConfigured } = getTelegramConfig();

if (!isConfigured) {
  console.error('❌ Chưa cấu hình TELEGRAM_BOT_TOKEN trong file .env!');
  console.error('👉 Hãy tạo bot với @BotFather trên Telegram, lấy token và dán vào .env:');
  console.error('   TELEGRAM_BOT_TOKEN="your_token_here"\n');
  process.exit(1);
}

console.log('====================================================');
console.log(`🤖 Khởi động Telegram Sales Bot: @${username}`);
console.log('📡 Chế độ: Long Polling (Local Development)');
console.log('🛒 Danh mục hỗ trợ: 🔐 Tài khoản số & 📁 File Code');
console.log('💳 Cổng thanh toán: PayOS VietQR Napas 24/7');
console.log('====================================================');

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} đã kết nối thành công và đang lắng nghe tin nhắn!`);
    console.log('Nhấn Ctrl+C để dừng bot.');
  },
});
