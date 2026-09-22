import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.R2_BUCKET || '';

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

/**
 * Khởi tạo S3 Client cho Cloudflare R2
 * Endpoint: https://<accountid>.r2.cloudflarestorage.com
 */
export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export interface GetSignedUrlOptions {
  storageKey: string;
  filename?: string;
  expiresInSeconds?: number; // Mặc định 15 phút (900 giây)
}

/**
 * Sinh Signed URL tải tệp bảo mật từ R2 với thời hạn (TTL) 15 phút.
 * Tệp chỉ có thể tải trong thời hạn quy định, hết hạn URL sẽ vô hiệu.
 */
export async function getSignedDownloadUrl({
  storageKey,
  filename,
  expiresInSeconds = 900, // 15 phút
}: GetSignedUrlOptions): Promise<string> {
  if (!r2Client || !bucketName) {
    console.log('\n==========================================');
    console.log('📦 [MOCK STORAGE R2 - Chưa cấu hình Cloudflare R2 Keys]');
    console.log(`Storage Key: ${storageKey}`);
    console.log(`Tên file đính kèm: ${filename || 'file.zip'}`);
    console.log(`TTL: ${expiresInSeconds}s (15 phút)`);
    console.log('==========================================\n');

    // Môi trường dev khi chưa có tài khoản Cloudflare R2:
    // Trả về mock URL mô phỏng link tải trực tiếp an toàn
    return `https://mock-storage.local/download/${encodeURIComponent(storageKey)}?ttl=${expiresInSeconds}&file=${encodeURIComponent(filename || 'file.zip')}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ResponseContentDisposition: filename
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : 'attachment',
  });

  return await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });
}

/**
 * Upload tệp sản phẩm hoặc tài liệu số lên Cloudflare R2 (Private Bucket)
 */
export async function uploadToStorage(
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType = 'application/zip',
): Promise<boolean> {
  if (!r2Client || !bucketName) {
    console.log(`📦 [MOCK STORAGE] Bỏ qua upload thật cho key: ${storageKey} (Chưa cấu hình R2)`);
    return true;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('Lỗi upload tệp lên Cloudflare R2:', error);
    throw error;
  }
}
