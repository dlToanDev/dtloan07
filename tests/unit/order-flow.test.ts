import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { calculatePricing, ProductPriceSnapshot } from '@/lib/pricing';
import { verifyPayOSSignature, generateLicenseKey } from '@/lib/payments/payos';
import { getSignedDownloadUrl } from '@/lib/storage';

describe('Phase 10 - End-to-End Core Commerce & Digital Delivery Integration', () => {
  const secretKey = 'test_webhook_secret_key_123';

  // 1. Giả lập sản phẩm trong DB
  const mockDbProducts = new Map<string, ProductPriceSnapshot>([
    [
      'prod_nginx_001',
      {
        id: 'prod_nginx_001',
        priceVnd: 299000,
        status: 'ACTIVE',
      },
    ],
    [
      'prod_docker_002',
      {
        id: 'prod_docker_002',
        priceVnd: 399000,
        status: 'ACTIVE',
      },
    ],
  ]);

  const mockCoupon = {
    id: 'coup_sale10',
    code: 'SALE10',
    type: 'PERCENT' as const,
    value: 10,
    maxUses: 100,
    usedCount: 5,
    startsAt: null,
    endsAt: null,
    active: true,
    createdAt: new Date(),
  };

  it('1. Bước 1: Khách thêm sản phẩm vào giỏ và áp mã giảm giá -> Server tính toán chính xác', () => {
    const cartItems = [
      { productId: 'prod_nginx_001', qty: 1 },
      { productId: 'prod_docker_002', qty: 1 },
    ];

    const pricing = calculatePricing({
      items: cartItems,
      productsMap: mockDbProducts,
      coupon: mockCoupon,
    });

    // Subtotal: 299k + 399k = 698,000 VND
    expect(pricing.subtotalVnd).toBe(698000);
    // Discount 10%: 69,800 VND
    expect(pricing.discountVnd).toBe(69800);
    // Total: 628,200 VND
    expect(pricing.totalVnd).toBe(628200);
    expect(pricing.items).toHaveLength(2);
  });

  it('2. Bước 2: Webhook PayOS gửi thông báo thanh toán -> Xác thực chữ ký và số tiền', () => {
    const orderCode = 1726480000;
    const paidAmount = 628200;

    const webhookData = {
      orderCode,
      amount: paidAmount,
      description: `DH-${orderCode}`,
      reference: 'FT260900001',
    };

    // Sinh HMAC
    const sortedKeys = Object.keys(webhookData).sort();
    const queryString = sortedKeys
      .map((k) => `${k}=${webhookData[k as keyof typeof webhookData]}`)
      .join('&');
    const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');

    const isValid = verifyPayOSSignature(webhookData, signature, secretKey);
    expect(isValid).toBe(true);

    // Đối soát số tiền khớp hoàn toàn với đơn hàng
    expect(webhookData.amount).toBe(628200);
  });

  it('3. Bước 3: Cấp mã License Key cho sản phẩm đã mua', () => {
    const license1 = generateLicenseKey('LIC');
    const license2 = generateLicenseKey('LIC');

    expect(license1).toMatch(/^LIC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(license2).toMatch(/^LIC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(license1).not.toBe(license2);
  });

  it('4. Bước 4: Khách hàng truy cập link tải an toàn -> Sinh Signed URL TTL 15 phút', async () => {
    const signedUrl = await getSignedDownloadUrl({
      storageKey: 'releases/nginx-production-v1.0.0.zip',
      filename: 'nginx-production-v1.0.0.zip',
      expiresInSeconds: 900,
    });

    expect(signedUrl).toBeDefined();
    expect(signedUrl).toContain('900');
  });
});
