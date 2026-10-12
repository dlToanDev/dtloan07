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
    let requestUrl: string;
    if (apiUrl.includes('ouo.io') || apiUrl.includes('ouo.press')) {
      // Chuẩn API của Ouo.io: https://ouo.io/api/{API_KEY}?s={TARGET_URL}
      requestUrl = `https://ouo.io/api/${apiKey}?s=${encodeURIComponent(targetUrl)}`;
    } else if (apiUrl.includes('link4m')) {
      // Chuẩn Link4M Quick Link: https://link4m.co/st?api={API_KEY}&url={TARGET_URL}
      // link4m.co/st là endpoint chính thức hoạt động (link4m.com/api redirect 404)
      requestUrl = `https://link4m.co/st?api=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
    } else {
      // Chuẩn chung AdLinkFly (MegaURL, Shrinkearn, Clicksfly, Exe.io...)
      const url = new URL(apiUrl);
      url.searchParams.set('api', apiKey);
      url.searchParams.set('url', targetUrl);
      requestUrl = url.toString();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(requestUrl, {
      method: 'GET',
      redirect: 'manual', // Bắt 301/302 Redirect Location header từ các dịch vụ như Link4M
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);

    // 1. Trường hợp dịch vụ trả về 301/302 Redirect trực tiếp (chuẩn Quick Link của Link4M)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location && (location.startsWith('http://') || location.startsWith('https://'))) {
        return { success: true, shortenedUrl: location };
      }
    }

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
