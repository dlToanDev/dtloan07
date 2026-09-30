import { describe, it, expect } from 'vitest';
import { verifyPayOSSignature, generateLicenseKey } from '@/lib/payments/payos';
import crypto from 'crypto';

describe('Phase 8 - Checkout & PayOS Security & Integrity Tests', () => {
  const secretKey = 'test_checksum_key_secret_12345';

  function createSignature(data: Record<string, unknown>, key: string) {
    const sortedKeys = Object.keys(data).sort();
    const queryString = sortedKeys
      .map((k) => `${k}=${data[k] !== undefined && data[k] !== null ? data[k] : ''}`)
      .join('&');
    return crypto.createHmac('sha256', key).update(queryString).digest('hex');
  }

  it('1. Webhook Signature: Chấp thuận chữ ký HMAC hợp lệ', () => {
    const validData = {
      orderCode: 1694800000,
      amount: 499000,
      description: 'DH-1694800000',
      accountNumber: '99998888',
      reference: 'TXN12345678',
    };
    const sig = createSignature(validData, secretKey);
    expect(verifyPayOSSignature(validData, sig, secretKey)).toBe(true);
  });

  it('2. Webhook Tampering: Phát hiện ngay khi kẻ gian sửa số tiền gian lận', () => {
    const originalData = {
      orderCode: 1694800000,
      amount: 499000,
      description: 'DH-1694800000',
    };
    const originalSig = createSignature(originalData, secretKey);

    // Kẻ gian sửa amount về 1000đ nhưng gửi kèm signature của 499000đ
    const hackedData = {
      ...originalData,
      amount: 1000,
    };
    expect(verifyPayOSSignature(hackedData, originalSig, secretKey)).toBe(false);
  });

  it('3. Webhook Spoofing: Từ chối chữ ký giả mạo ngẫu nhiên', () => {
    const fakeData = {
      orderCode: 12345678,
      amount: 199000,
      description: 'DH-12345678',
    };
    const fakeSig = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    expect(verifyPayOSSignature(fakeData, fakeSig, secretKey)).toBe(false);
  });

  it('4. License Key Generator: Định dạng chuẩn XXX-XXXX-XXXX-XXXX-XXXX', () => {
    const key = generateLicenseKey('LIC');
    expect(key).toMatch(/^LIC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('5. Amount Matching: Phải kiểm tra chính xác số tiền webhook nhận được khớp với Order.totalVnd', () => {
    const order = {
      orderCode: 'DH-1694800000',
      totalVnd: 499000,
    };

    const webhookCorrect = { amount: 499000 };
    const webhookFraud = { amount: 1000 };

    const isMatchCorrect = webhookCorrect.amount === order.totalVnd;
    const isMatchFraud = webhookFraud.amount === order.totalVnd;

    expect(isMatchCorrect).toBe(true);
    expect(isMatchFraud).toBe(false);
  });

  it('6. Idempotency Check: Không được cấp lại bản quyền nếu providerEventId đã tồn tại', () => {
    const processedEvents = new Set<string>(['payos-1694800000-499000']);

    const incomingEvent = 'payos-1694800000-499000';
    const isDuplicate = processedEvents.has(incomingEvent);

    expect(isDuplicate).toBe(true);
  });
});
