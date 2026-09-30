import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  decryptCredentials,
  encryptCredentials,
  isCredentialKeyConfigured,
  splitCredentialLines,
} from '@/lib/crypto/credentials';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const originalKey = process.env.ACCOUNT_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.ACCOUNT_ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.ACCOUNT_ENCRYPTION_KEY;
  else process.env.ACCOUNT_ENCRYPTION_KEY = originalKey;
});

describe('encryptCredentials / decryptCredentials', () => {
  it('giải mã lại ra đúng bản gốc, kể cả tiếng Việt có dấu và ký tự đặc biệt', () => {
    const plain = 'netflix@example.com|MậtKhẩu#123|Gói 3 tháng, chia sẻ 1 slot';
    expect(decryptCredentials(encryptCredentials(plain))).toBe(plain);
  });

  it('mã hóa cùng một chuỗi hai lần cho kết quả khác nhau (IV ngẫu nhiên)', () => {
    const plain = 'a@b.com|123456';
    expect(encryptCredentials(plain)).not.toBe(encryptCredentials(plain));
  });

  it('không lưu chữ thường: bản mã không chứa nội dung gốc', () => {
    const blob = encryptCredentials('secret@example.com|hunter2');
    expect(blob).not.toContain('secret@example.com');
    expect(blob).not.toContain('hunter2');
  });

  it('báo lỗi khi dữ liệu bị sửa (tag không khớp)', () => {
    const blob = encryptCredentials('a@b.com|123456');
    const raw = Buffer.from(blob, 'base64');
    raw[raw.length - 1] = raw[raw.length - 1]! ^ 0xff;
    expect(() => decryptCredentials(raw.toString('base64'))).toThrow();
  });

  it('báo lỗi khi giải mã bằng khóa khác', () => {
    const blob = encryptCredentials('a@b.com|123456');
    process.env.ACCOUNT_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    expect(() => decryptCredentials(blob)).toThrow();
  });

  it('báo lỗi rõ ràng khi thiếu khóa', () => {
    delete process.env.ACCOUNT_ENCRYPTION_KEY;
    expect(isCredentialKeyConfigured()).toBe(false);
    expect(() => encryptCredentials('a@b.com')).toThrow(/ACCOUNT_ENCRYPTION_KEY/);
  });

  it('báo lỗi khi khóa sai độ dài', () => {
    process.env.ACCOUNT_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
    expect(isCredentialKeyConfigured()).toBe(false);
    expect(() => encryptCredentials('a@b.com')).toThrow(/32 byte/);
  });

  it('từ chối chuỗi rỗng', () => {
    expect(() => encryptCredentials('   ')).toThrow();
  });

  it('báo lỗi với blob quá ngắn', () => {
    expect(() => decryptCredentials('AAAA')).toThrow(/không hợp lệ/);
  });
});

describe('splitCredentialLines', () => {
  it('tách theo dòng, bỏ dòng trống và khoảng trắng thừa', () => {
    expect(splitCredentialLines('  a@b.com|1 \n\n c@d.com|2\r\n  \n')).toEqual([
      'a@b.com|1',
      'c@d.com|2',
    ]);
    expect(splitCredentialLines('')).toEqual([]);
  });
});
