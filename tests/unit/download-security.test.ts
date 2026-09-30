import { describe, it, expect } from 'vitest';
import { getSignedDownloadUrl } from '@/lib/storage';

interface LicenseAuthCheckParams {
  license: {
    id: string;
    userId: string | null;
    email: string;
    key: string;
    downloadCount: number;
    maxDownloads: number;
    expiresAt: Date | null;
    revokedAt: Date | null;
  };
  currentUser?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
  } | null;
  providedKey?: string | null;
  providedEmail?: string | null;
}

/**
 * Pure authorization check function matching logic in /api/download/[licenseId]
 */
function checkDownloadAuthorization({
  license,
  currentUser,
  providedKey,
  providedEmail,
}: LicenseAuthCheckParams): { allowed: boolean; reason?: string } {
  // 1. Kiểm tra quyền sở hữu
  const isAdmin = currentUser?.role === 'ADMIN';
  const isOwnerUser = currentUser?.id && license.userId && currentUser.id === license.userId;
  const isOwnerEmail =
    currentUser?.email && currentUser.email.toLowerCase() === license.email.toLowerCase();
  const hasValidKey = providedKey && providedKey.trim().toUpperCase() === license.key.toUpperCase();
  const hasValidEmail =
    providedEmail && providedEmail.trim().toLowerCase() === license.email.toLowerCase();

  const isAuthorized =
    isAdmin || isOwnerUser || isOwnerEmail || (hasValidKey && hasValidEmail) || hasValidKey;

  if (!isAuthorized) {
    return { allowed: false, reason: 'FORBIDDEN_USER' };
  }

  // 2. Kiểm tra thu hồi
  if (license.revokedAt) {
    return { allowed: false, reason: 'REVOKED' };
  }

  // 3. Kiểm tra hết hạn
  if (license.expiresAt && new Date() > license.expiresAt) {
    return { allowed: false, reason: 'EXPIRED' };
  }

  // 4. Kiểm tra số lượt tải
  if (license.downloadCount >= license.maxDownloads) {
    return { allowed: false, reason: 'MAX_DOWNLOADS_EXCEEDED' };
  }

  return { allowed: true };
}

describe('Phase 9 - Digital Delivery & Download Security Tests (P9-8)', () => {
  const baseLicense = {
    id: 'lic_user_b_123',
    userId: 'user_b_id',
    email: 'user_b@example.com',
    key: 'LIC-BBBB-BBBB-BBBB-BBBB',
    downloadCount: 1,
    maxDownloads: 5,
    expiresAt: null,
    revokedAt: null,
  };

  it('1. Bảo mật: User A cố ý tải License của User B -> Bị chặn 403 Forbidden', () => {
    const userA = {
      id: 'user_a_id',
      email: 'user_a@example.com',
      role: 'USER' as const,
    };

    const result = checkDownloadAuthorization({
      license: baseLicense,
      currentUser: userA,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('FORBIDDEN_USER');
  });

  it('2. Chính chủ User B tải License của mình -> Được phép', () => {
    const userB = {
      id: 'user_b_id',
      email: 'user_b@example.com',
      role: 'USER' as const,
    };

    const result = checkDownloadAuthorization({
      license: baseLicense,
      currentUser: userB,
    });

    expect(result.allowed).toBe(true);
  });

  it('3. Quyền Admin: Admin có thể tải hoặc kiểm tra license của bất kỳ ai', () => {
    const admin = {
      id: 'admin_id',
      email: 'admin@hvpgroup.vn',
      role: 'ADMIN' as const,
    };

    const result = checkDownloadAuthorization({
      license: baseLicense,
      currentUser: admin,
    });

    expect(result.allowed).toBe(true);
  });

  it('4. Guest Checkout: Cung cấp đúng mã License Key -> Được phép tải', () => {
    const result = checkDownloadAuthorization({
      license: baseLicense,
      currentUser: null,
      providedKey: 'LIC-BBBB-BBBB-BBBB-BBBB',
    });

    expect(result.allowed).toBe(true);
  });

  it('5. Guest Checkout: Khách lạ đoán mò licenseId không có key -> Bị chặn', () => {
    const result = checkDownloadAuthorization({
      license: baseLicense,
      currentUser: null,
      providedKey: null,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('FORBIDDEN_USER');
  });

  it('6. Chống gian lận: License đã bị thu hồi (Refund/Chargeback) -> Bị chặn', () => {
    const revokedLicense = {
      ...baseLicense,
      revokedAt: new Date(Date.now() - 1000 * 60), // Đã thu hồi 1 phút trước
    };

    const result = checkDownloadAuthorization({
      license: revokedLicense,
      currentUser: { id: 'user_b_id', email: 'user_b@example.com', role: 'USER' },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('REVOKED');
  });

  it('7. Giới hạn lượt tải: Đã tải đủ số lần quy định (5/5) -> Bị chặn', () => {
    const maxedLicense = {
      ...baseLicense,
      downloadCount: 5,
      maxDownloads: 5,
    };

    const result = checkDownloadAuthorization({
      license: maxedLicense,
      currentUser: { id: 'user_b_id', email: 'user_b@example.com', role: 'USER' },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('MAX_DOWNLOADS_EXCEEDED');
  });

  it('8. Storage: Signed URL được cấu hình với TTL 15 phút (900s)', async () => {
    const url = await getSignedDownloadUrl({
      storageKey: 'products/nginx-template.zip',
      filename: 'nginx-template-v1.0.0.zip',
      expiresInSeconds: 900,
    });

    expect(url).toContain('900');
    expect(url).toBeDefined();
  });
});
