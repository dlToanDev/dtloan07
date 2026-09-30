import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/security/audit';

/**
 * Lấy cấu hình TTL mặc định (tính bằng giây).
 * Hỗ trợ 900 (15m), 1800 (30m), 3600 (1h), 21600 (6h), 86400 (24h).
 */
export function getDefaultAdminTokenTtl(): number {
  const envVal = Number(process.env.ADMIN_URL_TOKEN_TTL);
  if (Number.isFinite(envVal) && envVal > 0) {
    return envVal;
  }
  return 3600; // Mặc định 1 giờ
}

/**
 * Băm token bằng SHA-256 trước khi lưu hoặc tra cứu trong cơ sở dữ liệu.
 * Đảm bảo cơ sở dữ liệu không bao giờ chứa token nguyên bản (plaintext).
 */
export function hashAdminToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Sinh token ngẫu nhiên bảo mật cao sử dụng `crypto.randomBytes(24)`.
 * Độ dài chuỗi 32 ký tự URL-safe (base64url), entropy 192 bit.
 */
export function generateCryptographicTokenString(): string {
  // Sinh 24 bytes ngẫu nhiên chuẩn cryptographic
  const random = crypto.randomBytes(24).toString('base64url');
  return `adm_${random}`;
}

export interface AdminTokenGenerationResult {
  token: string; // Token nguyên bản CHỈ trả về duy nhất 1 lần khi sinh
  expiresAt: Date;
  prefix: string;
}

/**
 * Tạo token URL Admin bảo mật mới.
 * Tự động vô hiệu hóa (revoke) các token cũ của admin để đảm bảo chỉ có tối đa 1 token active.
 */
export async function generateSecureAdminToken(
  adminUserId: string,
  ttlSeconds?: number,
  label = 'Admin Secure URL Token',
): Promise<AdminTokenGenerationResult> {
  const ttl = ttlSeconds ?? getDefaultAdminTokenTtl();
  const rawToken = generateCryptographicTokenString();
  const tokenHash = hashAdminToken(rawToken);
  const tokenPrefix = `${rawToken.slice(0, 10)}...`;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  // Thu hồi toàn bộ token đang hoạt động trước đó của admin này
  await db.adminToken.updateMany({
    where: {
      createdById: adminUserId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedBy: adminUserId,
    },
  });

  // Lưu bản ghi token mới với hash (KHÔNG lưu plaintext)
  await db.adminToken.create({
    data: {
      tokenHash,
      tokenPrefix,
      createdById: adminUserId,
      expiresAt,
      label,
    },
  });

  await logAuditEvent({
    action: 'ADMIN_TOKEN_GENERATE',
    actorId: adminUserId,
    details: {
      tokenPrefix,
      ttlSeconds: ttl,
      expiresAt: expiresAt.toISOString(),
      label,
    },
  });

  return {
    token: rawToken,
    expiresAt,
    prefix: tokenPrefix,
  };
}

/**
 * Xoay tua (rotate) token URL Admin: vô hiệu hóa toàn bộ token cũ và cấp token mới.
 */
export async function rotateAdminToken(
  adminUserId: string,
  ttlSeconds?: number,
): Promise<AdminTokenGenerationResult> {
  const result = await generateSecureAdminToken(adminUserId, ttlSeconds, 'Rotated Admin URL Token');

  await logAuditEvent({
    action: 'ADMIN_TOKEN_ROTATE',
    actorId: adminUserId,
    details: {
      tokenPrefix: result.prefix,
      expiresAt: result.expiresAt.toISOString(),
    },
  });

  return result;
}

/**
 * Thu hồi (revoke) token URL Admin: làm vô hiệu hóa ngay lập tức.
 */
export async function revokeAdminToken(adminUserId: string, tokenId?: string): Promise<boolean> {
  try {
    if (tokenId) {
      await db.adminToken.update({
        where: { id: tokenId },
        data: {
          revokedAt: new Date(),
          revokedBy: adminUserId,
        },
      });
    } else {
      await db.adminToken.updateMany({
        where: {
          createdById: adminUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedBy: adminUserId,
        },
      });
    }

    await logAuditEvent({
      action: 'ADMIN_TOKEN_REVOKE',
      actorId: adminUserId,
      details: {
        tokenId: tokenId ?? 'ALL_ACTIVE',
      },
    });

    return true;
  } catch {
    return false;
  }
}

export type AdminTokenValidationReason = 'VALID' | 'NOT_FOUND' | 'REVOKED' | 'EXPIRED';

export interface AdminTokenValidationResult {
  valid: boolean;
  reason: AdminTokenValidationReason;
  createdById?: string;
  expiresAt?: Date;
}

/**
 * Xác thực token URL Admin: kiểm tra hash, trạng thái thu hồi và thời gian sống.
 */
export async function validateAdminToken(rawToken: string): Promise<AdminTokenValidationResult> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const tokenHash = hashAdminToken(rawToken);

  try {
    const record = await db.adminToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        createdById: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!record) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (record.revokedAt) {
      return { valid: false, reason: 'REVOKED' };
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // Cập nhật thời gian sử dụng gần nhất (không block request)
    db.adminToken
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return {
      valid: true,
      reason: 'VALID',
      createdById: record.createdById,
      expiresAt: record.expiresAt,
    };
  } catch {
    return { valid: false, reason: 'NOT_FOUND' };
  }
}

export interface AdminTokenPublicInfo {
  hasActive: boolean;
  prefix?: string;
  createdAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  isRevoked?: boolean;
  ttlSeconds: number;
}

/**
 * Lấy thông tin trạng thái token hiện tại để hiển thị an toàn trên giao diện Admin UI.
 * Tuyệt đối không trả về raw token hay tokenHash.
 */
export async function getActiveAdminTokenInfo(adminUserId: string): Promise<AdminTokenPublicInfo> {
  const ttlSeconds = getDefaultAdminTokenTtl();

  try {
    const latest = await db.adminToken.findFirst({
      where: { createdById: adminUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        tokenPrefix: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!latest) {
      return { hasActive: false, ttlSeconds };
    }

    const now = Date.now();
    const isExpired = latest.expiresAt.getTime() <= now;
    const isRevoked = Boolean(latest.revokedAt);
    const hasActive = !isExpired && !isRevoked;

    return {
      hasActive,
      prefix: latest.tokenPrefix,
      createdAt: latest.createdAt.toISOString(),
      expiresAt: latest.expiresAt.toISOString(),
      isExpired,
      isRevoked,
      ttlSeconds,
    };
  } catch {
    return { hasActive: false, ttlSeconds };
  }
}

/**
 * Lấy token hợp lệ còn hiệu lực hoặc tự động sinh token mới nếu chưa có hoặc đã hết hạn.
 * Dùng khi Admin đăng nhập thành công và nhấn vào nút "Trang quản trị Admin".
 */
export async function getOrCreateActiveAdminToken(
  adminUserId: string,
): Promise<{ token: string; expiresAt: Date }> {
  // Vì DB chỉ lưu hash chứ không lưu raw token, nên để bảo mật tuyệt đối không bao giờ
  // lưu trữ hay phục hồi plaintext token từ cơ sở dữ liệu.
  // Khi admin yêu cầu truy cập từ giao diện, hệ thống cấp một token mới duy nhất và thu hồi token cũ.
  return generateSecureAdminToken(adminUserId);
}
