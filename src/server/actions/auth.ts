'use server';

import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { signIn } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/mail';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { checkAuthRateLimit, checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { logAuditEvent } from '@/lib/security/audit';

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export type RegisterResult = AuthActionResult;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gửi mã OTP xác nhận về Email để đăng ký tài khoản
 */
export async function sendRegistrationOtp(
  emailRaw: string,
  passwordRaw: string,
  confirmPasswordRaw: string,
  _nameRaw?: string,
): Promise<AuthActionResult> {
  const email = emailRaw?.toLowerCase().trim();
  const password = passwordRaw;
  const confirmPassword = confirmPasswordRaw;

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.' };
  }

  let clientIp = '127.0.0.1';
  try {
    const headerList = await headers();
    clientIp = getClientIp(headerList);
  } catch {
    // Trong môi trường test hoặc không có headers context
  }

  // Giới hạn tần suất theo IP (tối đa 5 yêu cầu gửi OTP trong 5 phút trên một IP)
  const ipRateLimit = checkRateLimit(`otp-ip:${clientIp}`, 5, 300);
  if (!ipRateLimit.success) {
    return {
      success: false,
      error:
        'Địa chỉ IP của bạn đã gửi yêu cầu xác thực quá nhiều lần. Vui lòng thử lại sau ít phút.',
    };
  }

  const rateLimit = checkAuthRateLimit(email);
  if (!rateLimit.success) {
    return {
      success: false,
      error: 'Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau 1 phút.',
    };
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.' };
  }

  // Kiểm tra tài khoản đã tồn tại và có mật khẩu hay chưa
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  if (existingUser && existingUser.password) {
    return {
      success: false,
      error: 'Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab Đăng nhập.',
    };
  }

  // Chống spam: kiểm tra mã OTP gửi gần đây (trong vòng 60 giây)
  const identifier = `register:${email}`;
  const existingToken = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: 'desc' },
  });

  if (existingToken) {
    const msUntilExpiry = existingToken.expires.getTime() - Date.now();
    // Token có thời hạn 10 phút (600,000ms), nếu còn hơn 9 phút (540,000ms) nghĩa là mới gửi trong vòng 60s
    if (msUntilExpiry > 9 * 60 * 1000) {
      const waitSeconds = Math.ceil((msUntilExpiry - 9 * 60 * 1000) / 1000);
      return {
        success: false,
        error: `Mã xác thực vừa được gửi. Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu mã mới.`,
      };
    }
  }

  // Sinh mã OTP 6 chữ số ngẫu nhiên chuẩn cryptographic (100000 - 999999)
  const code = crypto.randomInt(100000, 1000000).toString();

  // Lưu mã vào bảng VerificationToken với hạn 10 phút
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  await db.verificationToken.create({
    data: {
      identifier,
      token: code,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // Gửi email xác thực OTP trực tiếp qua Gmail SMTP + Nodemailer
  try {
    await sendVerificationEmail(email, code);

    return {
      success: true,
      message: `Mã xác nhận 6 chữ số đã được gửi tới ${email}. Vui lòng kiểm tra hộp thư (cả thư mục Spam).`,
    };
  } catch (error) {
    console.error('❌ Lỗi gửi email xác thực đăng ký qua Gmail SMTP:', error);
    return {
      success: false,
      error:
        'Không thể gửi email xác thực đến địa chỉ của bạn. Vui lòng kiểm tra cấu hình Gmail SMTP hoặc thử lại sau.',
    };
  }
}

/**
 * Xác thực mã OTP và tiến hành tạo tài khoản người dùng
 */
export async function verifyOtpAndRegister({
  emailRaw,
  passwordRaw,
  confirmPasswordRaw,
  codeRaw,
  nameRaw,
}: {
  emailRaw: string;
  passwordRaw: string;
  confirmPasswordRaw: string;
  codeRaw: string;
  nameRaw?: string;
}): Promise<AuthActionResult> {
  const email = emailRaw?.toLowerCase().trim();
  const password = passwordRaw;
  const confirmPassword = confirmPasswordRaw;
  const code = codeRaw?.trim();
  const name = nameRaw?.trim();

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: 'Địa chỉ email không hợp lệ.' };
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Mật khẩu xác nhận không khớp.' };
  }

  if (!code || code.length !== 6) {
    return { success: false, error: 'Mã xác nhận phải gồm đúng 6 chữ số.' };
  }

  const identifier = `register:${email}`;

  // Kiểm tra mã OTP trong database
  const record = await db.verificationToken.findFirst({
    where: {
      identifier,
      token: code,
    },
  });

  if (!record) {
    return {
      success: false,
      error: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại email của bạn.',
    };
  }

  if (record.expires < new Date()) {
    return {
      success: false,
      error: 'Mã xác thực đã hết hạn (quá 10 phút). Vui lòng bấm gửi lại mã mới.',
    };
  }

  // Xóa mã OTP đã sử dụng
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  // Hash mật khẩu
  const hashedPassword = await bcrypt.hash(password, 10);
  const displayName = name || email.split('@')[0];

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.password) {
      return {
        success: false,
        error: 'Email này đã có tài khoản với mật khẩu. Vui lòng đăng nhập.',
      };
    }
    // Tài khoản trước đó tạo bằng Google/GitHub, cập nhật mật khẩu và xác thực email
    await db.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        name: existingUser.name || displayName,
        emailVerified: new Date(),
      },
    });
  } else {
    // Tạo tài khoản mới
    await db.user.create({
      data: {
        email,
        name: displayName,
        password: hashedPassword,
        role: 'USER',
        emailVerified: new Date(),
      },
    });
  }

  return {
    success: true,
    message: 'Tạo tài khoản thành công! Đang tự động đăng nhập...',
  };
}

/**
 * Đăng ký tài khoản (hỗ trợ gọi trực tiếp từ form hoặc API)
 */
export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const email = (formData.get('email') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const name = (formData.get('name') as string)?.trim();

  if (!email || !password) {
    return { success: false, error: 'Vui lòng điền đầy đủ email và mật khẩu.' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.' };
  }

  if (confirmPassword && password !== confirmPassword) {
    return { success: false, error: 'Mật khẩu xác nhận không khớp.' };
  }

  // Kiểm tra email đã tồn tại chưa
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.password) {
      return { success: false, error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' };
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        name: existingUser.name || name || email.split('@')[0],
        emailVerified: new Date(),
      },
    });
    return { success: true };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      role: 'USER',
      emailVerified: new Date(),
    },
  });

  return { success: true };
}

/**
 * Đăng nhập bằng Email + Mật khẩu qua Server Action
 */
export async function loginWithCredentialsAction(
  formData: FormData,
  redirectTo: string = '/account',
) {
  const email = (formData.get('email') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;

  let clientIp = '127.0.0.1';
  let userAgent = 'Unknown';
  try {
    const headerList = await headers();
    clientIp = getClientIp(headerList);
    userAgent = headerList.get('user-agent') || 'Unknown';
  } catch {
    // Trong môi trường test hoặc không có headers context
  }

  // Giới hạn tần suất đăng nhập theo IP (tối đa 20 lần thử / phút / IP)
  const ipRateLimit = checkRateLimit(`login-ip:${clientIp}`, 20, 60);
  if (!ipRateLimit.success) {
    return {
      success: false,
      error:
        'Địa chỉ IP của bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 1 phút trước khi thử lại.',
    };
  }

  if (email) {
    const rateLimit = checkAuthRateLimit(email);
    if (!rateLimit.success) {
      return {
        success: false,
        error:
          'Tài khoản này đã thử đăng nhập sai quá nhiều lần. Vui lòng chờ 1 phút trước khi thử lại.',
      };
    }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Ghi nhận nhật ký sự kiện đăng nhập thất bại cho mục tiêu giám sát bảo mật
      if (email) {
        logAuditEvent({
          action: 'ADMIN_LOGIN_FAILED',
          actorEmail: email,
          ipAddress: clientIp,
          userAgent,
          details: {
            authErrorType: error.type,
          },
        }).catch(() => {});
      }

      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Email hoặc mật khẩu không chính xác.' };
        default:
          return { success: false, error: 'Đăng nhập không thành công. Vui lòng thử lại.' };
      }
    }
    throw error;
  }
}

/**
 * Đăng nhập bằng Google OAuth qua Server Action
 */
export async function loginWithGoogleAction(redirectTo: string = '/account') {
  await signIn('google', { redirectTo });
}

/**
 * Đăng nhập bằng GitHub OAuth qua Server Action
 */
export async function loginWithGithubAction(redirectTo: string = '/account') {
  await signIn('github', { redirectTo });
}
