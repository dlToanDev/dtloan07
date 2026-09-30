/**
 * Telegram Bot Configuration
 */

export function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim() || 'BlogSalesBot';
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || '';

  return {
    token,
    username,
    webhookSecret,
    isConfigured: Boolean(token),
  };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
