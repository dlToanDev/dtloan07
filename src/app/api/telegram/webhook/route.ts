import { bot } from '@/lib/telegram/bot';
import { webhookCallback } from 'grammy';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handleWebhook = webhookCallback(bot, 'std/http');

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (configuredSecret) {
      const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== configuredSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook secret token' }, { status: 401 });
      }
    }

    return await handleWebhook(req);
  } catch (error) {
    console.error('Lỗi khi xử lý Telegram Webhook update:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram Sales Bot Webhook endpoint is operational.',
  });
}
