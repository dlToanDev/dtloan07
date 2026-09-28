/**
 * Gọi server action từ client mà không bao giờ "im lặng" khi lỗi: action ném lỗi / mất mạng /
 * trang cũ sau khi deploy đều trả về { ok: false, error } để form hiện thông báo.
 */
export async function safeAction<T extends { ok: boolean }>(
  call: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await call();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Server action failed:', error);
    if (/Server Action|Failed to find|fetch failed|Failed to fetch|NetworkError/i.test(message))
      return {
        ok: false,
        error: 'Trang đã cũ hoặc mất kết nối — tải lại trang (Ctrl+Shift+R) rồi thử lại.',
      };
    return { ok: false, error: message || 'Có lỗi xảy ra, vui lòng thử lại.' };
  }
}
