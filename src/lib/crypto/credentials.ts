import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Mã hóa thông tin đăng nhập tài khoản số bằng AES-256-GCM.
 *
 * Định dạng lưu trong DB: base64( iv(12) | tag(16) | ciphertext ).
 * GCM cho cả tính bí mật lẫn toàn vẹn — sửa một byte trong DB thì giải mã sẽ
 * throw thay vì trả ra dữ liệu rác.
 */

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export class CredentialKeyMissingError extends Error {
  constructor() {
    super(
      'Chưa cấu hình ACCOUNT_ENCRYPTION_KEY. Sinh khóa bằng `openssl rand -base64 32` rồi thêm vào .env.',
    );
    this.name = 'CredentialKeyMissingError';
  }
}

function readKey(): Buffer {
  const raw = process.env.ACCOUNT_ENCRYPTION_KEY;
  if (!raw) throw new CredentialKeyMissingError();

  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ACCOUNT_ENCRYPTION_KEY phải là 32 byte mã hóa base64 (hiện tại ${key.length} byte).`,
    );
  }
  return key;
}

/** Có khóa hợp lệ hay chưa — dùng để khóa tính năng thay vì để lỗi rơi xuống tận request của khách. */
export function isCredentialKeyConfigured(): boolean {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptCredentials(plain: string): string {
  if (typeof plain !== 'string' || plain.trim() === '') {
    throw new Error('Thông tin tài khoản không được để trống.');
  }

  const key = readKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptCredentials(blob: string): string {
  const key = readKey();
  const raw = Buffer.from(blob, 'base64');

  if (raw.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('Dữ liệu tài khoản đã mã hóa không hợp lệ.');
  }

  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  // final() throw khi tag không khớp → dữ liệu đã bị sửa hoặc sai khóa.
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Tách nội dung dán hàng loạt thành từng tài khoản (mỗi dòng một tài khoản),
 * bỏ dòng trống và khoảng trắng thừa.
 */
export function splitCredentialLines(bulk: string): string[] {
  return bulk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
