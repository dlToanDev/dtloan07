import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type AuditAction =
  | 'ADMIN_TOKEN_GENERATE'
  | 'ADMIN_TOKEN_ROTATE'
  | 'ADMIN_TOKEN_REVOKE'
  | 'ADMIN_TOKEN_ACCESS'
  | 'ADMIN_TOKEN_INVALID'
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_ACCESS_BLOCKED'
  | 'SETTINGS_UPDATE'
  | 'PASSWORD_CHANGE'
  | 'ORDER_STATUS_UPDATE'
  | 'PRODUCT_UPDATE'
  | 'USER_LOCKED';

export interface AuditLogInput {
  action: AuditAction | string;
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Lọc bỏ mọi trường nhạy cảm trước khi lưu vào Audit Log (defense-in-depth).
 * Tuyệt đối không lưu mật khẩu, secret, JWT, OTP, hay token nguyên bản.
 */
function sanitizeAuditDetails(
  details?: Record<string, unknown> | null,
): Prisma.InputJsonValue | undefined {
  if (!details || typeof details !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {};
  const SENSITIVE_KEY_REGEX = /password|secret|token|hash|otp|key|credential|auth/i;

  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as Prisma.InputJsonValue;
}

/**
 * Ghi nhật ký bảo mật (Audit Log) một cách an toàn và không gây gián đoạn luồng chính.
 */
export async function logAuditEvent(entry: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        ipAddress: entry.ipAddress ? entry.ipAddress.slice(0, 100) : null,
        userAgent: entry.userAgent ? entry.userAgent.slice(0, 300) : null,
        details: sanitizeAuditDetails(entry.details),
      },
    });
  } catch (err) {
    // Audit log không được làm sập ứng dụng chính
    console.error('Audit log failure:', err instanceof Error ? err.message : err);
  }
}

/**
 * Lấy danh sách audit log gần nhất cho màn hình quản trị bảo mật.
 */
export async function getRecentAuditLogs(limit = 15) {
  try {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return logs;
  } catch {
    return [];
  }
}
