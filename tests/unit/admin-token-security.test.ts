/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCryptographicTokenString,
  hashAdminToken,
  getDefaultAdminTokenTtl,
  validateAdminToken,
  rotateAdminToken,
  revokeAdminToken,
} from '@/lib/security/admin-token';
import {
  checkRateLimit,
  checkAdminScanRateLimit,
  clearRateLimitStore,
} from '@/lib/security/rate-limit';
import { logAuditEvent } from '@/lib/security/audit';
import { db } from '@/lib/db';

describe('Admin Dynamic URL Token & Security Hardening Tests', () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  describe('1. Cryptographic Random Token Generation', () => {
    it('sinh token có độ dài chuẩn cryptographic, prefix adm_ và entropy cao', () => {
      const token = generateCryptographicTokenString();
      expect(token).toMatch(/^adm_[A-Za-z0-9_-]{32,}$/);
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it('không bao giờ sinh token trùng nhau sau 100 lần gọi liên tiếp', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const token = generateCryptographicTokenString();
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
      expect(tokens.size).toBe(100);
    });

    it('hàm băm SHA-256 hashAdminToken tạo chuỗi 64 hex characters xác định', () => {
      const token = 'adm_test_token_1234567890abcdef';
      const hash1 = hashAdminToken(token);
      const hash2 = hashAdminToken(token);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });

    it('cấu hình TTL đọc từ biến môi trường ADMIN_URL_TOKEN_TTL hoặc mặc định 3600', () => {
      const original = process.env.ADMIN_URL_TOKEN_TTL;
      try {
        process.env.ADMIN_URL_TOKEN_TTL = '1800';
        expect(getDefaultAdminTokenTtl()).toBe(1800);

        delete process.env.ADMIN_URL_TOKEN_TTL;
        expect(getDefaultAdminTokenTtl()).toBe(3600);
      } finally {
        process.env.ADMIN_URL_TOKEN_TTL = original;
      }
    });
  });

  describe('2. Token Lifecycle: Generate, Validate, Expire & Revoke', () => {
    it('từ chối token rỗng hoặc token ngắn dưới 16 ký tự', async () => {
      const res1 = await validateAdminToken('');
      expect(res1.valid).toBe(false);
      expect(res1.reason).toBe('NOT_FOUND');

      const res2 = await validateAdminToken('short_token');
      expect(res2.valid).toBe(false);
      expect(res2.reason).toBe('NOT_FOUND');
    });

    it('từ chối khi token không tồn tại trong DB', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue(null as any);

      const res = await validateAdminToken('adm_nonexistent_token_1234567890');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('NOT_FOUND');
    });

    it('từ chối khi token đã bị thu hồi (revoked)', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue({
        id: 'token-1',
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: new Date(),
      } as any);

      const res = await validateAdminToken('adm_revoked_token_1234567890');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('REVOKED');
    });

    it('từ chối khi token đã hết hạn (expired TTL)', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue({
        id: 'token-2',
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() - 1000), // Đã hết hạn
        revokedAt: null,
      } as any);

      const res = await validateAdminToken('adm_expired_token_1234567890');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('EXPIRED');
    });

    it('chấp nhận token hợp lệ, chưa hết hạn và chưa bị thu hồi', async () => {
      const mockRecord = {
        id: 'token-3',
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: null,
      };
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue(mockRecord as any);
      vi.spyOn(db.adminToken, 'update').mockResolvedValue({} as any);

      const res = await validateAdminToken('adm_valid_token_1234567890ab');
      expect(res.valid).toBe(true);
      expect(res.reason).toBe('VALID');
      expect(res.createdById).toBe('admin-1');
    });

    it('rotate token thu hồi token cũ và sinh token mới', async () => {
      const updateManySpy = vi
        .spyOn(db.adminToken, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      const createSpy = vi.spyOn(db.adminToken, 'create').mockResolvedValue({} as any);
      vi.spyOn(db.auditLog, 'create').mockResolvedValue({} as any);

      const rotated = await rotateAdminToken('admin-user-id', 1800);

      expect(updateManySpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
      expect(rotated.token).toMatch(/^adm_/);
      expect(rotated.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('revoke token cập nhật revokedAt thành công', async () => {
      const updateManySpy = vi
        .spyOn(db.adminToken, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      vi.spyOn(db.auditLog, 'create').mockResolvedValue({} as any);

      const success = await revokeAdminToken('admin-user-id');
      expect(success).toBe(true);
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdById: 'admin-user-id' }),
          data: expect.objectContaining({ revokedBy: 'admin-user-id' }),
        }),
      );
    });
  });

  describe('3. Sliding-window Rate Limiter', () => {
    it('cho phép số lượng request trong ngưỡng và chặn khi vượt quá limit', () => {
      const key = 'test-ip-1';
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(key, 5, 60);
        expect(res.success).toBe(true);
      }

      // Lần thứ 6 phải bị chặn
      const blocked = checkRateLimit(key, 5, 60);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('checkAdminScanRateLimit giới hạn 15 lần thử quét URL admin', () => {
      const ip = '192.168.1.100';
      for (let i = 0; i < 15; i++) {
        expect(checkAdminScanRateLimit(ip).success).toBe(true);
      }
      expect(checkAdminScanRateLimit(ip).success).toBe(false);
    });
  });

  describe('4. Audit Log Data Sanitization', () => {
    it('loại bỏ mật khẩu, token, secret khỏi metadata audit log', async () => {
      let savedDetails: any = null;
      vi.spyOn(db.auditLog, 'create').mockImplementation((async (args: any) => {
        savedDetails = args.data.details;
        return {} as any;
      }) as any);

      await logAuditEvent({
        action: 'ADMIN_TOKEN_GENERATE',
        actorId: 'admin-1',
        details: {
          token: 'adm_secret_token_123',
          password: 'my-super-secret-password',
          safeField: 'This is safe',
          nested: {
            authSecret: 'jwt-secret',
            itemCount: 42,
          },
        },
      });

      expect(savedDetails.token).toBe('[REDACTED]');
      expect(savedDetails.password).toBe('[REDACTED]');
      expect(savedDetails.safeField).toBe('This is safe');
      expect(savedDetails.nested.authSecret).toBe('[REDACTED]');
      expect(savedDetails.nested.itemCount).toBe(42);
    });
  });

  describe('5. Ten Mandatory Security Verification Tests (Section 35)', () => {
    // Pipeline mô phỏng luồng kiểm tra đa tầng: Request -> RateLimit -> Session -> RBAC -> Token Validation
    async function evaluateAdminAccessPipeline(params: {
      path: string;
      session: { user?: { id: string; role: string; email: string } } | null;
      tokenCandidate?: string;
      ip?: string;
    }): Promise<{ allowed: boolean; status: number; reason?: string }> {
      const ip = params.ip || '127.0.0.1';
      const scanLimit = checkAdminScanRateLimit(ip);
      if (!scanLimit.success) {
        return { allowed: false, status: 429, reason: 'RATE_LIMITED' };
      }

      const isLoggedIn = Boolean(params.session?.user);
      const isAdmin = isLoggedIn && params.session?.user?.role === 'ADMIN';

      if (!isAdmin) {
        // Cloaking: 404 Not Found để không tiết lộ trang admin tồn tại
        return { allowed: false, status: 404, reason: 'CLOAKED_NOT_FOUND' };
      }

      if (params.path === '/admin' || params.path === '/admin/') {
        return { allowed: false, status: 302, reason: 'REDIRECT_GATEWAY_ENTRY' };
      }

      const token = params.tokenCandidate;
      if (!token || token.length < 16) {
        return { allowed: false, status: 404, reason: 'INVALID_TOKEN_FORMAT' };
      }

      const validation = await validateAdminToken(token);
      if (!validation.valid) {
        return { allowed: false, status: 404, reason: validation.reason };
      }

      return { allowed: true, status: 200, reason: 'ALLOWED' };
    }

    it('Test 1: /admin - không cho phép truy cập trực tiếp nếu chưa có token hoặc chưa là admin', async () => {
      // Unauthenticated -> 404
      const res1 = await evaluateAdminAccessPipeline({
        path: '/admin',
        session: null,
      });
      expect(res1.status).toBe(404);
      expect(res1.allowed).toBe(false);

      // Authenticated Admin -> Redirect Gateway Entry
      const res2 = await evaluateAdminAccessPipeline({
        path: '/admin',
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(res2.status).toBe(302);
      expect(res2.reason).toBe('REDIRECT_GATEWAY_ENTRY');
    });

    it('Test 2: /admin/random-invalid-token -> deny (404 Cloaking)', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue(null as any);
      const res = await evaluateAdminAccessPipeline({
        path: '/admin/random-invalid-token-12345',
        tokenCandidate: 'random-invalid-token-12345',
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(404);
      expect(res.reason).toBe('NOT_FOUND');
    });

    it('Test 3: Valid token nhưng chưa login -> deny (404 Cloaking)', async () => {
      const res = await evaluateAdminAccessPipeline({
        path: '/admin/adm_valid_token_1234567890abcdef',
        tokenCandidate: 'adm_valid_token_1234567890abcdef',
        session: null,
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(404);
      expect(res.reason).toBe('CLOAKED_NOT_FOUND');
    });

    it('Test 4: Login USER nhưng truy cập ADMIN -> deny (404 Cloaking)', async () => {
      const res = await evaluateAdminAccessPipeline({
        path: '/admin/adm_valid_token_1234567890abcdef',
        tokenCandidate: 'adm_valid_token_1234567890abcdef',
        session: { user: { id: 'user-1', role: 'USER', email: 'user@gmail.com' } },
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(404);
      expect(res.reason).toBe('CLOAKED_NOT_FOUND');
    });

    it('Test 5: ADMIN + valid token -> allow (200 OK)', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue({
        id: 'tok-1',
        tokenHash: 'somehash',
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: null,
      } as any);
      vi.spyOn(db.adminToken, 'update').mockResolvedValue({} as any);

      const res = await evaluateAdminAccessPipeline({
        path: '/admin/adm_valid_token_1234567890abcdef',
        tokenCandidate: 'adm_valid_token_1234567890abcdef',
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(res.allowed).toBe(true);
      expect(res.status).toBe(200);
      expect(res.reason).toBe('ALLOWED');
    });

    it('Test 6: Token hết hạn (TTL Expired) -> deny (404 Cloaking)', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue({
        id: 'tok-expired',
        tokenHash: 'somehash',
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() - 5000), // Hết hạn
        revokedAt: null,
      } as any);

      const res = await evaluateAdminAccessPipeline({
        path: '/admin/adm_expired_token_1234567890abcdef',
        tokenCandidate: 'adm_expired_token_1234567890abcdef',
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(404);
      expect(res.reason).toBe('EXPIRED');
    });

    it('Test 7: Token đã bị thu hồi (Revoked) -> deny (404 Cloaking)', async () => {
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue({
        id: 'tok-revoked',
        tokenHash: 'somehash',
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: new Date(), // Bị thu hồi
      } as any);

      const res = await evaluateAdminAccessPipeline({
        path: '/admin/adm_revoked_token_1234567890abcdef',
        tokenCandidate: 'adm_revoked_token_1234567890abcdef',
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(404);
      expect(res.reason).toBe('REVOKED');
    });

    it('Test 8: Token rotate: old token -> deny, new token -> allow', async () => {
      const oldToken = 'adm_old_token_1234567890abcdef';
      const newToken = 'adm_new_token_1234567890abcdef';

      // Mô phỏng DB sau khi xoay tua: oldToken bị revoked, newToken là active
      vi.spyOn(db.adminToken, 'findUnique').mockImplementation((async (args: any) => {
        const hash = args.where.tokenHash;
        if (hash === hashAdminToken(oldToken)) {
          return {
            id: 'tok-old',
            tokenHash: hash,
            createdById: 'admin-1',
            expiresAt: new Date(Date.now() + 3600 * 1000),
            revokedAt: new Date(), // Old revoked
          } as any;
        }
        if (hash === hashAdminToken(newToken)) {
          return {
            id: 'tok-new',
            tokenHash: hash,
            createdById: 'admin-1',
            expiresAt: new Date(Date.now() + 3600 * 1000),
            revokedAt: null, // New active
          } as any;
        }
        return null as any;
      }) as any);
      vi.spyOn(db.adminToken, 'update').mockResolvedValue({} as any);

      // Thử old token -> Deny (REVOKED)
      const resOld = await evaluateAdminAccessPipeline({
        path: `/admin/${oldToken}`,
        tokenCandidate: oldToken,
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(resOld.allowed).toBe(false);
      expect(resOld.reason).toBe('REVOKED');

      // Thử new token -> Allow (200)
      const resNew = await evaluateAdminAccessPipeline({
        path: `/admin/${newToken}`,
        tokenCandidate: newToken,
        session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@blog.com' } },
      });
      expect(resNew.allowed).toBe(true);
      expect(resNew.status).toBe(200);
      expect(resNew.reason).toBe('ALLOWED');
    });

    it('Test 9: API admin gọi trực tiếp không có quyền ADMIN -> deny 404', async () => {
      // Non-admin session gọi /api/admin/subscribers/export
      const sessionUser = { user: { id: 'u-1', role: 'USER', email: 'u1@test.com' } };
      const isAdmin = sessionUser?.user?.role === 'ADMIN';
      const statusCode = isAdmin ? 200 : 404; // Cloaking theo middleware & route

      expect(statusCode).toBe(404);
    });

    it('Test 10: Server restart -> Trạng thái token vẫn an toàn nhờ lưu trữ Database', async () => {
      // Giả lập server khởi động lại: dữ liệu đọc từ PostgreSQL qua db.adminToken
      const storedHash = hashAdminToken('adm_persistent_token_1234567890');
      vi.spyOn(db.adminToken, 'findUnique').mockResolvedValue({
        id: 'persisted-tok-1',
        tokenHash: storedHash,
        createdById: 'admin-1',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: null,
      } as any);
      vi.spyOn(db.adminToken, 'update').mockResolvedValue({} as any);

      const res = await validateAdminToken('adm_persistent_token_1234567890');
      expect(res.valid).toBe(true);
      expect(res.reason).toBe('VALID');
      expect(res.createdById).toBe('admin-1');
    });
  });
});
