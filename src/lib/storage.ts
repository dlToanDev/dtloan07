import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.R2_BUCKET || '';
// Tùy chọn: endpoint S3 khác (vd. MinIO chạy local để test upload). Để trống = Cloudflare R2.
const customEndpoint = process.env.R2_ENDPOINT || '';

export const isR2Configured = Boolean(
  (accountId || customEndpoint) && accessKeyId && secretAccessKey && bucketName,
);

/**
 * Khởi tạo S3 Client cho Cloudflare R2
 * Endpoint: https://<accountid>.r2.cloudflarestorage.com
 */
export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: customEndpoint || `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: Boolean(customEndpoint),
      // SDK mới tự gắn checksum vào link ký sẵn (tính trên body rỗng) → R2 báo BadDigest khi trình
      // duyệt PUT dữ liệu thật. Chỉ tính checksum khi API bắt buộc (khuyến nghị của Cloudflare R2).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
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
  /** true = trình duyệt mở xem ngay (vd. slide PDF) thay vì tải về. */
  inline?: boolean;
  contentType?: string;
}

/**
 * Sinh Signed URL tải tệp bảo mật từ R2 với thời hạn (TTL) 15 phút.
 * Tệp chỉ có thể tải trong thời hạn quy định, hết hạn URL sẽ vô hiệu.
 */
export async function getSignedDownloadUrl({
  storageKey,
  filename,
  expiresInSeconds = 900, // 15 phút
  inline = false,
  contentType,
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
    ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}${
      filename ? `; filename="${encodeURIComponent(filename)}"` : ''
    }`,
    ...(contentType && { ResponseContentType: contentType }),
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

// ---------------------------------------------------------------- Upload trực tiếp từ trình duyệt
// File lớn (video bài giảng…) được trình duyệt upload thẳng lên R2 theo từng phần qua link ký sẵn,
// server web không phải trung chuyển dữ liệu. Bucket cần CORS cho phép PUT và lộ header ETag.

function requireR2() {
  if (!r2Client || !bucketName) throw new Error('Chưa cấu hình Cloudflare R2.');
  return r2Client;
}

export async function startMultipartUpload(storageKey: string, contentType: string) {
  const result = await requireR2().send(
    new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: storageKey,
      ContentType: contentType,
    }),
  );
  if (!result.UploadId) throw new Error('R2 không trả về UploadId.');
  return result.UploadId;
}

/** Link ký sẵn cho từng phần (PartNumber bắt đầu từ 1). */
export async function presignUploadParts(
  storageKey: string,
  uploadId: string,
  partCount: number,
  expiresInSeconds = 6 * 3600,
) {
  const client = requireR2();
  return Promise.all(
    Array.from({ length: partCount }, (_, index) =>
      getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket: bucketName,
          Key: storageKey,
          UploadId: uploadId,
          PartNumber: index + 1,
        }),
        { expiresIn: expiresInSeconds },
      ),
    ),
  );
}

export async function completeMultipartUpload(
  storageKey: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
) {
  await requireR2().send(
    new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: storageKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: [...parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
      },
    }),
  );
}

export async function abortMultipartUpload(storageKey: string, uploadId: string) {
  await requireR2()
    .send(
      new AbortMultipartUploadCommand({ Bucket: bucketName, Key: storageKey, UploadId: uploadId }),
    )
    .catch((error) => console.warn('Abort multipart upload failed:', error));
}

/** Kích thước file trên R2 (byte), null nếu không có. */
export async function getObjectSize(storageKey: string): Promise<number | null> {
  try {
    const head = await requireR2().send(
      new HeadObjectCommand({ Bucket: bucketName, Key: storageKey }),
    );
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

/** Xóa file trên R2 — lỗi chỉ ghi log (file mồ côi không làm hỏng thao tác của admin). */
export async function deleteFromStorage(storageKey: string | null | undefined) {
  if (!storageKey || !r2Client || !bucketName) return;
  await r2Client
    .send(new DeleteObjectCommand({ Bucket: bucketName, Key: storageKey }))
    .catch((error) => console.warn('Delete from R2 failed:', storageKey, error));
}
