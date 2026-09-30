import { serverEnv } from '@/config/env';

export interface ShortenResult {
  success: boolean;
  shortenedUrl?: string;
  error?: string;
}

/**
 * Tự động rút gọn link qua API của các dịch vụ rút gọn link kiếm tiền
 * (MegaURL, Ouo.io, Shorte.st, Shrinkearn, Clicksfly...)
 *
 * Đa số các dịch vụ CPM cao đều dùng chuẩn AdLinkFly:
 * GET {API_URL}?api={API_KEY}&url={ENCODED_URL}
 * Response JSON: { status: "success", shortenedUrl: "..." }
 */
export async function shortenUrlWithMonetization(targetUrl: string): Promise<ShortenResult> {
  // Đảm bảo targetUrl hợp lệ
  try {
    new URL(targetUrl);
  } catch {
    return {
      success: false,
      error: 'URL cần rút gọn không hợp lệ.',
    };
  }

  const apiUrl = serverEnv.SHORTENER_API_URL;
  const apiKey = serverEnv.SHORTENER_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Chưa cấu hình SHORTENER_API_URL hoặc SHORTENER_API_KEY trong file .env',
    };
  }

  try {
    const url = new URL(apiUrl);
    url.searchParams.set('api', apiKey);
    url.searchParams.set('url', targetUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; BlogShortener/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Máy chủ rút gọn link phản hồi lỗi HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data.status === 'error' || data.error) {
        return {
          success: false,
          error: data.message || data.error || 'Lỗi từ dịch vụ rút gọn link.',
        };
      }
      const shortUrl = data.shortenedUrl || data.short_url || data.url;
      if (shortUrl) {
        return { success: true, shortenedUrl: shortUrl };
      }
    } else {
      const text = (await response.text()).trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return { success: true, shortenedUrl: text };
      }
    }

    return {
      success: false,
      error: 'Không nhận được đường dẫn rút gọn hợp lệ từ nhà cung cấp.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi kết nối tới dịch vụ rút gọn.';
    return {
      success: false,
      error: message,
    };
  }
}
