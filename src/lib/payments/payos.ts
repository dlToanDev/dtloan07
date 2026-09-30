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
  qrImageUrl?: string;
  bin?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  isMock?: boolean;
}

export const BANK_BIN_NAMES: Record<string, string> = {
  '970422': 'MB Bank (Quân Đội)',
  '970436': 'Vietcombank',
  '970407': 'Techcombank',
  '970415': 'VietinBank',
  '970418': 'BIDV',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970416': 'ACB',
  '970405': 'Agribank',
  '970454': 'SHB',
};

/**
 * Sinh link ảnh mã VietQR tiêu chuẩn NAPAS (VietQR.io)
 */
export function buildVietQRImageUrl({
  bin = '970422',
  accountNumber,
  accountName,
  amount,
  description,
}: {
  bin?: string;
  accountNumber: string;
  accountName?: string;
  amount: number;
  description: string;
}): string {
  const bank = bin || '970422';
  const acc = accountNumber || '';
  const amt = amount || 0;
  const desc = encodeURIComponent(description || '');
  const name = accountName ? `&accountName=${encodeURIComponent(accountName)}` : '';
  return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amt}&addInfo=${desc}${name}`;
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
    const mockBin = '970422';
    const mockAccountNumber = '0359876543';
    const mockAccountName = 'TRAN MINH TOAN';
    const mockQrUrl = buildVietQRImageUrl({
      bin: mockBin,
      accountNumber: mockAccountNumber,
      accountName: mockAccountName,
      amount: params.amount,
      description: safeDescription,
    });

    console.log('\n==========================================');
    console.log('💳 [MOCK PAYOS - Chưa cấu hình API Keys]');
    console.log(`Mã đơn: ${params.orderCode}, Số tiền: ${params.amount} VND`);
    console.log(`VietQR: ${mockQrUrl}`);
    console.log('==========================================\n');

    // Trong môi trường dev chưa điền key PayOS: Trả về link test kèm mock VietQR
    return {
      checkoutUrl: returnUrl,
      orderCode: params.orderCode,
      qrCode: mockQrUrl,
      qrImageUrl: mockQrUrl,
      bin: mockBin,
      bankName: BANK_BIN_NAMES[mockBin] || 'MB Bank',
      accountNumber: mockAccountNumber,
      accountName: mockAccountName,
      amount: params.amount,
      description: safeDescription,
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

  const bin = paymentLinkResponse.bin || '970422';
  const qrImageUrl = buildVietQRImageUrl({
    bin,
    accountNumber: paymentLinkResponse.accountNumber,
    accountName: paymentLinkResponse.accountName,
    amount: paymentLinkResponse.amount,
    description: paymentLinkResponse.description,
  });

  return {
    checkoutUrl: paymentLinkResponse.checkoutUrl,
    orderCode: paymentLinkResponse.orderCode,
    qrCode: paymentLinkResponse.qrCode,
    qrImageUrl,
    bin,
    bankName: BANK_BIN_NAMES[bin] || `Ngân hàng (BIN ${bin})`,
    accountNumber: paymentLinkResponse.accountNumber,
    accountName: paymentLinkResponse.accountName,
    amount: paymentLinkResponse.amount,
    description: paymentLinkResponse.description,
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
