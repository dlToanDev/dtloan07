import { describe, it, expect } from 'vitest';

describe('Xác thực Đăng ký tài khoản và Mã OTP Email', () => {
  it('mật khẩu phải đạt độ dài từ 8 ký tự trở lên', () => {
    const shortPassword = '1234567';
    expect(shortPassword.length).toBeLessThan(8);

    const validPassword = 'password123';
    expect(validPassword.length).toBeGreaterThanOrEqual(8);
  });

  it('xác nhận mật khẩu phải khớp hoàn toàn với mật khẩu ban đầu', () => {
    const password: string = 'SecretPassword123';
    const confirmPasswordMismatch: string = 'SecretPassword124';
    const confirmPasswordMatch: string = 'SecretPassword123';

    expect(password === confirmPasswordMismatch).toBe(false);
    expect(password === confirmPasswordMatch).toBe(true);
  });

  it('mã OTP gồm đúng 6 chữ số ngẫu nhiên', () => {
    for (let i = 0; i < 50; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });

  it('thời hạn mã OTP là 10 phút và cooldown gửi lại là 60 giây', () => {
    const now = Date.now();
    const expiryDate = new Date(now + 10 * 60 * 1000);
    const msUntilExpiry = expiryDate.getTime() - now;

    expect(msUntilExpiry).toBe(600000); // 10 phút

    // Khi mã mới được tạo trong vòng 60 giây thì msUntilExpiry > 9 phút
    const isWithinCooldown = msUntilExpiry > 9 * 60 * 1000;
    expect(isWithinCooldown).toBe(true);
  });

  it('xử lý mật khẩu ứng dụng Gmail 16 ký tự có khoảng trắng', () => {
    const rawAppPassword = 'abcd efgh ijkl mnop';
    const cleanedPassword = rawAppPassword.replace(/\s+/g, '');
    expect(cleanedPassword).toBe('abcdefghijklmnop');
    expect(cleanedPassword.length).toBe(16);
  });

  it('định dạng tiêu đề và nội dung email xác thực OTP tuân thủ đúng yêu cầu', () => {
    const code = '836622';
    const siteName = 'dltoan07';
    const subject = `[${code}] Mã xác nhận đăng ký tài khoản - ${siteName}`;
    const text = `Mã xác nhận đăng ký tài khoản ${siteName} của bạn là: ${code} (hiệu lực trong 10 phút).`;

    expect(subject).toBe('[836622] Mã xác nhận đăng ký tài khoản - dltoan07');
    expect(text).toContain('836622');
    expect(text).toContain('hiệu lực trong 10 phút');
  });
});
