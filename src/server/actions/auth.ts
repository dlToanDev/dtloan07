'use server';

import { db } from '@/lib/db';
import { signIn } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';

export interface RegisterResult {
  success: boolean;
  error?: string;
}

/**
 * Đăng ký tài khoản mới bằng Email + Mật khẩu
 */
export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const email = (formData.get('email') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;
  const name = (formData.get('name') as string)?.trim();

  if (!email || !password) {
    return { success: false, error: 'Vui lòng điền đầy đủ email và mật khẩu.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' };
  }

  // Kiểm tra email đã tồn tại chưa
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.password) {
      return { success: false, error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' };
    }
    // Nếu trước đó đăng nhập bằng Google, cập nhật thêm mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        name: existingUser.name || name || email.split('@')[0],
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

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Email hoặc mật khẩu không chính xác.' };
        default:
          return { success: false, error: 'Đăng nhập không thành công. Vui lòng thử lại.' };
      }
    }
    throw error; // Re-throw Next.js redirect
  }
}
