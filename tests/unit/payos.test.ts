import { describe, it, expect } from 'vitest';
import { verifyPayOSSignature, generateLicenseKey } from '@/lib/payments/payos';
import crypto from 'crypto';

describe('PayOS Security & License Helper (src/lib/payments/payos.ts)', () => {
  const secretKey = 'test_checksum_key_secret_12345';

  function createSignature(data: Record<string, unknown>, key: string) {
    const sortedKeys = Object.keys(data).sort();
    const queryString = sortedKeys
      .map((k) => `${k}=${data[k] !== undefined && data[k] !== null ? data[k] : ''}`)
      .join('&');
    return crypto.createHmac('sha256', key).update(queryString).digest('hex');
  }

  it('1. Xác thực thành công với chữ ký HMAC SHA256 chính xác', () => {
    const sampleData = {
      orderCode: 12345678,
      amount: 199000,
      description: 'DH-12345678',
      accountNumber: '0987654321',
      reference: 'FT230914001',
    };

    const validSignature = createSignature(sampleData, secretKey);
    const isValid = verifyPayOSSignature(sampleData, validSignature, secretKey);

    expect(isValid).toBe(true);
  });

  it('2. Từ chối chữ ký giả mạo hoặc sai lệch secret key', () => {
    const sampleData = {
      orderCode: 12345678,
      amount: 199000,
      description: 'DH-12345678',
    };

    const fakeSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const isValid = verifyPayOSSignature(sampleData, fakeSignature, secretKey);

    expect(isValid).toBe(false);
  });

  it('3. Từ chối khi payload bị sửa số tiền (Man-in-the-middle tamper)', () => {
    const originalData = {
      orderCode: 12345678,
      amount: 199000,
      description: 'DH-12345678',
    };

    const originalSignature = createSignature(originalData, secretKey);

    // Kẻ tấn công sửa số tiền thành 1000 đồng nhưng vẫn gửi chữ ký cũ
    const tamperedData = {
      ...originalData,
      amount: 1000,
    };

    const isValid = verifyPayOSSignature(tamperedData, originalSignature, secretKey);
    expect(isValid).toBe(false);
  });

  it('4. Sinh mã bản quyền License đúng định dạng', () => {
    const key = generateLicenseKey('BLOG');
    expect(key).toMatch(/^BLOG-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('5. Các mã bản quyền được sinh độc nhất và không bị trùng', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateLicenseKey('LIC'));
    }
    expect(keys.size).toBe(100);
  });

  it('6. buildVietQRImageUrl sinh đúng đường link ảnh chuẩn VietQR NAPAS', async () => {
    const { buildVietQRImageUrl, BANK_BIN_NAMES } = await import('@/lib/payments/payos');

    const url = buildVietQRImageUrl({
      bin: '970422',
      accountNumber: '0359876543',
      accountName: 'TRAN MINH TOAN',
      amount: 100000,
      description: 'NAP 123456',
    });

    expect(url).toContain('https://img.vietqr.io/image/970422-0359876543-compact2.png');
    expect(url).toContain('amount=100000');
    expect(url).toContain('addInfo=NAP%20123456');
    expect(url).toContain('accountName=TRAN%20MINH%20TOAN');
    expect(BANK_BIN_NAMES['970422']).toContain('MB Bank');
  });
});
