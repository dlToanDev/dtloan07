/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCurrentAffiliateToken,
  getAffiliatePath,
  isValidAffiliateToken,
  getAffiliateTokenExpiry,
  generateTokenForSlot,
  getCurrentSlot,
  RESERVED_ROUTES,
} from '@/lib/affiliate-token';

describe('Affiliate Dynamic Rotating Token', () => {
  const baseTime = 1759240000000; // Cố định thời điểm test
  const rotationMinutes = 30;
  const intervalMs = rotationMinutes * 60 * 1000;

  it('sinh token là chuỗi 16 ký tự hexa hợp lệ', () => {
    const token = getCurrentAffiliateToken(baseTime);
    expect(token).toBeTypeOf('string');
    expect(token.length).toBe(16);
    expect(/^[0-9a-f]{16}$/.test(token)).toBe(true);
  });

  it('đảm bảo tính nhất quán (deterministic) trong cùng một khung thời gian', () => {
    const token1 = getCurrentAffiliateToken(baseTime);
    const token2 = getCurrentAffiliateToken(baseTime + 1000 * 60); // 1 phút sau
    expect(token1).toBe(token2);
  });

  it('tự động đổi chuỗi token mới khi bước sang khung thời gian tiếp theo', () => {
    const tokenCurrent = getCurrentAffiliateToken(baseTime);
    const tokenNext = getCurrentAffiliateToken(baseTime + intervalMs);
    expect(tokenCurrent).not.toBe(tokenNext);
  });

  it('xác thực token hiện tại thành công', () => {
    const currentToken = getCurrentAffiliateToken(baseTime);
    expect(isValidAffiliateToken(currentToken, baseTime)).toBe(true);
  });

  it('chấp nhận token của chu kỳ liền trước (Grace Period ân hạn)', () => {
    const prevToken = generateTokenForSlot(getCurrentSlot(baseTime) - 1);
    expect(isValidAffiliateToken(prevToken, baseTime)).toBe(true);
  });

  it('từ chối token đã quá hạn từ 2 chu kỳ trở lên', () => {
    const oldToken = generateTokenForSlot(getCurrentSlot(baseTime) - 2);
    expect(isValidAffiliateToken(oldToken, baseTime)).toBe(false);
  });

  it('từ chối chuỗi rác hoặc token giả mạo ngẫu nhiên', () => {
    expect(isValidAffiliateToken('random-hacker-guess', baseTime)).toBe(false);
    expect(isValidAffiliateToken('1234567890abcdef', baseTime)).toBe(false);
    expect(isValidAffiliateToken('', baseTime)).toBe(false);
    expect(isValidAffiliateToken(undefined as any, baseTime)).toBe(false);
  });

  it('từ chối tất cả các route tĩnh cố định của hệ thống (RESERVED_ROUTES)', () => {
    expect(isValidAffiliateToken('affiliate', baseTime)).toBe(false);
    expect(isValidAffiliateToken('blog', baseTime)).toBe(false);
    expect(isValidAffiliateToken('courses', baseTime)).toBe(false);
    expect(isValidAffiliateToken('admin', baseTime)).toBe(false);
    expect(isValidAffiliateToken('api', baseTime)).toBe(false);
    expect(isValidAffiliateToken('shop', baseTime)).toBe(false);
  });

  it('getAffiliatePath trả về URL tương đối bắt đầu bằng / kèm token hợp lệ', () => {
    const path = getAffiliatePath(baseTime);
    expect(path.startsWith('/')).toBe(true);
    const token = path.replace('/', '');
    expect(isValidAffiliateToken(token, baseTime)).toBe(true);
  });

  it('tính toán chính xác thời gian hết hạn (expiry) và số giây còn lại', () => {
    const expiry = getAffiliateTokenExpiry(baseTime);
    expect(expiry.rotationMinutes).toBe(30);
    expect(expiry.expiresAt).toBeGreaterThan(baseTime);
    expect(expiry.remainingSeconds).toBeGreaterThan(0);
    expect(expiry.remainingSeconds).toBeLessThanOrEqual(30 * 60);
  });
});
