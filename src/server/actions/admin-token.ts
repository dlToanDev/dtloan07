'use server';

import { auth } from '@/lib/auth';
import {
  generateSecureAdminToken,
  rotateAdminToken,
  revokeAdminToken,
  getActiveAdminTokenInfo,
  type AdminTokenPublicInfo,
} from '@/lib/security/admin-token';
import { getRecentAuditLogs } from '@/lib/security/audit';

async function requireAdminUser() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN' || !session.user.id) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

/**
 * Tạo/Lấy URL truy cập khu vực Admin an toàn với Signed Token.
 * Dùng khi Admin nhấn vào nút "Đến Trang Quản Trị" từ màn hình cá nhân / hồ sơ.
 */
export async function getAdminAccessUrl(): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const user = await requireAdminUser();
    const result = await generateSecureAdminToken(user.id);
    return {
      success: true,
      url: `/admin/${result.token}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Không có quyền truy cập',
    };
  }
}

/**
 * Xoay tua (rotate) URL Admin: vô hiệu hóa token cũ ngay lập tức và sinh token mới.
 */
export async function rotateAdminTokenAction(
  ttlSeconds?: number,
): Promise<{ success: boolean; url?: string; expiresAt?: string; error?: string }> {
  try {
    const user = await requireAdminUser();
    let validatedTtl: number | undefined = undefined;
    if (
      typeof ttlSeconds === 'number' &&
      Number.isFinite(ttlSeconds) &&
      ttlSeconds >= 60 &&
      ttlSeconds <= 7 * 86400
    ) {
      validatedTtl = Math.floor(ttlSeconds);
    }
    const result = await rotateAdminToken(user.id, validatedTtl);
    return {
      success: true,
      url: `/admin/${result.token}`,
      expiresAt: result.expiresAt.toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi xoay tua token',
    };
  }
}

/**
 * Thu hồi (revoke) toàn bộ token URL Admin đang hoạt động.
 */
export async function revokeAdminTokenAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminUser();
    const ok = await revokeAdminToken(user.id);
    return { success: ok };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi thu hồi token',
    };
  }
}

export interface AdminSecurityOverviewData {
  tokenInfo: AdminTokenPublicInfo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentLogs: any[];
}

/**
 * Lấy dữ liệu tổng quan bảo mật Admin (trạng thái token, nhật ký audit gần nhất).
 */
export async function getAdminSecurityOverview(): Promise<AdminSecurityOverviewData> {
  const user = await requireAdminUser();

  const [tokenInfo, recentLogs] = await Promise.all([
    getActiveAdminTokenInfo(user.id),
    getRecentAuditLogs(10),
  ]);

  return {
    tokenInfo,
    recentLogs,
  };
}
