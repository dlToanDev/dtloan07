/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shortenUrlWithMonetization } from '@/lib/shortener';
import { serverEnv } from '@/config/env';

describe('Shortener Service (src/lib/shortener.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. Trả về lỗi khi URL cần rút gọn không hợp lệ', async () => {
    const result = await shortenUrlWithMonetization('not-a-url');
    expect(result.success).toBe(false);
    expect(result.error).toContain('không hợp lệ');
  });

  it('2. Trả về thông báo lỗi khi chưa cấu hình SHORTENER_API_URL/KEY trong .env', async () => {
    // Tạm thời gán undefined
    const origUrl = serverEnv.SHORTENER_API_URL;
    (serverEnv as any).SHORTENER_API_URL = undefined;

    const result = await shortenUrlWithMonetization('https://hetzner.cloud/?ref=demo');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Chưa cấu hình SHORTENER_API_URL');

    // Khôi phục
    (serverEnv as any).SHORTENER_API_URL = origUrl;
  });

  it('3. Rút gọn thành công khi API trả về JSON chuẩn AdLinkFly', async () => {
    (serverEnv as any).SHORTENER_API_URL = 'https://megaurl.in/api';
    (serverEnv as any).SHORTENER_API_KEY = 'test-token-123';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        shortenedUrl: 'https://megaurl.in/money123',
      }),
    } as any);

    const result = await shortenUrlWithMonetization('https://hetzner.cloud/?ref=demo');
    expect(result.success).toBe(true);
    expect(result.shortenedUrl).toBe('https://megaurl.in/money123');
  });

  it('4. Bắt lỗi khi dịch vụ rút gọn phản hồi trạng thái error', async () => {
    (serverEnv as any).SHORTENER_API_URL = 'https://megaurl.in/api';
    (serverEnv as any).SHORTENER_API_KEY = 'invalid-token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'error',
        message: 'Invalid API Token',
      }),
    } as any);

    const result = await shortenUrlWithMonetization('https://hetzner.cloud/?ref=demo');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API Token');
  });

  it('5. Rút gọn thành công khi dịch vụ trả về dạng text/plain URL', async () => {
    (serverEnv as any).SHORTENER_API_URL = 'https://ouo.io/api';
    (serverEnv as any).SHORTENER_API_KEY = 'test-ouo';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'https://ouo.io/short123',
    } as any);

    const result = await shortenUrlWithMonetization('https://digitalocean.com');
    expect(result.success).toBe(true);
    expect(result.shortenedUrl).toBe('https://ouo.io/short123');
  });
});
