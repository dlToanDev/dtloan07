import { PayOS } from '@payos/node';
import crypto from 'crypto';
import { siteConfig } from '@/config/site';

const clientId = process.env.PAYOS_CLIENT_ID || '';
const apiKey = process.env.PAYOS_API_KEY || '';
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

const isConfigured = Boolean(clientId && apiKey && checksumKey);
export const payosClient = isConfigured ? new PayOS({ clientId, apiKey, checksumKey }) : null;

export interface CreatePayOSLinkParams {
  orderCode: number; // Phải là số nguyên dương <= 9007199254740991
  amount: number;
  description: string;
  returnUrl?: string;
  cancelUrl?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface PayOSLinkResult {
  checkoutUrl: string;
  orderCode: number;
  qrCode?: string;
  isMock?: boolean;
}

/**
 * Tạo Payment Link thanh toán VietQR qua PayOS
 */
export async function createPayOSPaymentLink(
  params: CreatePayOSLinkParams,
): Promise<PayOSLinkResult> {
  const returnUrl =
    params.returnUrl || `${siteConfig.url}/checkout/success?orderCode=${params.orderCode}`;
  const cancelUrl =
    params.cancelUrl || `${siteConfig.url}/checkout/cancel?orderCode=${params.orderCode}`;

  // Chuẩn hoá description: tối đa 25 ký tự không dấu (giới hạn ngân hàng)
  const safeDescription = params.description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 25);

  if (!payosClient) {
    console.log('\n==========================================');
    console.log('💳 [MOCK PAYOS - Chưa cấu hình API Keys]');
    console.log(`Mã đơn: ${params.orderCode}, Số tiền: ${params.amount} VND`);
    console.log(`Return URL: ${returnUrl}`);
    console.log('==========================================\n');

    // Trong môi trường dev chưa điền key PayOS: Trả về link test
    return {
      checkoutUrl: returnUrl,
      orderCode: params.orderCode,
      isMock: true,
    };
  }

  const paymentLinkResponse = await payosClient.paymentRequests.create({
    orderCode: params.orderCode,
    amount: params.amount,
    description: safeDescription,
    returnUrl,
    cancelUrl,
    items: params.items || [],
  });

  return {
    checkoutUrl: paymentLinkResponse.checkoutUrl,
    orderCode: paymentLinkResponse.orderCode,
    qrCode: paymentLinkResponse.qrCode,
    isMock: false,
  };
}

/**
 * Tự xác thực chữ ký HMAC SHA256 của PayOS trên dữ liệu webhook
 * Khóa bí mật: PAYOS_CHECKSUM_KEY
 */
export function verifyPayOSSignature(
  data: Record<string, unknown>,
  signature: string,
  key: string = checksumKey,
): boolean {
  if (!key || !signature) return false;

  try {
    // 1. Sắp xếp các khóa theo thứ tự bảng chữ cái A-Z
    const sortedKeys = Object.keys(data).sort();

    // 2. Ghép thành chuỗi query: key1=value1&key2=value2...
    const queryString = sortedKeys
      .map((k) => `${k}=${data[k] !== undefined && data[k] !== null ? data[k] : ''}`)
      .join('&');

    // 3. Tính toán HMAC SHA256
    const expectedSignature = crypto.createHmac('sha256', key).update(queryString).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch (error) {
    console.error('Lỗi đối soát chữ ký PayOS:', error);
    return false;
  }
}

/**
 * Sinh chuỗi mã bản quyền cá nhân ngẫu nhiên: BLOG-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(prefix = 'LIC'): string {
  const bytes = crypto.randomBytes(8).toString('hex').toUpperCase();
  // Chia thành 4 cụm 4 ký tự: LIC-XXXX-XXXX-XXXX-XXXX
  return `${prefix}-${bytes.slice(0, 4)}-${bytes.slice(4, 8)}-${bytes.slice(8, 12)}-${bytes.slice(12, 16)}`;
}
