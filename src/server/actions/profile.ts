'use server';

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logAuditEvent } from '@/lib/security/audit';

export interface ProfileActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AvatarUploadResult {
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
}

const AVATAR_DIR = path.join(process.cwd(), 'public', 'images', 'avatars');
const AVATAR_URL_PREFIX = '/images/avatars/';
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Tải ảnh đại diện từ máy tính lên máy chủ
 */
export async function uploadAvatar(formData: FormData): Promise<AvatarUploadResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Vui lòng chọn một tệp hình ảnh.' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { success: false, error: 'Dung lượng ảnh tối đa là 5 MB.' };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) {
    return {
      success: false,
      error: 'Chỉ chấp nhận các định dạng ảnh: PNG, JPG, JPEG, WebP, GIF hoặc AVIF.',
    };
  }

  try {
    const fileName = `${randomUUID()}${ext}`;
    await mkdir(AVATAR_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(AVATAR_DIR, fileName), buffer);

    const imageUrl = `${AVATAR_URL_PREFIX}${fileName}`;

    await db.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    revalidatePath('/account');
    return { success: true, url: imageUrl, message: 'Tải ảnh đại diện lên thành công!' };
  } catch (error) {
    console.error('Lỗi khi tải ảnh đại diện:', error);
    return { success: false, error: 'Không thể tải ảnh đại diện. Vui lòng thử lại.' };
  }
}

/**
 * Cập nhật thông tin tài khoản (Họ và tên, Avatar, Tuổi tác, Địa chỉ, Học vấn, Giới thiệu)
 */
export async function updateProfile(formData: FormData): Promise<ProfileActionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const image = (formData.get('image') as string)?.trim() || null;
  const rawAge = (formData.get('age') as string)?.trim();
  const address = (formData.get('address') as string)?.trim() || null;
  const education = (formData.get('education') as string)?.trim() || null;
  const bio = (formData.get('bio') as string)?.trim() || null;

  if (!name) {
    return { success: false, error: 'Họ và tên không được để trống.' };
  }

  if (name.length < 2 || name.length > 80) {
    return { success: false, error: 'Họ và tên phải từ 2 đến 80 ký tự.' };
  }

  if (
    image &&
    !image.startsWith('http://') &&
    !image.startsWith('https://') &&
    !image.startsWith('/') &&
    !image.startsWith('data:image/')
  ) {
    return { success: false, error: 'Đường dẫn ảnh đại diện không hợp lệ.' };
  }

  let age: number | null = null;
  if (rawAge) {
    const parsedAge = parseInt(rawAge, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return { success: false, error: 'Tuổi phải là số hợp lệ từ 1 đến 120.' };
    }
    age = parsedAge;
  }

  if (address && address.length > 255) {
    return { success: false, error: 'Địa chỉ không được vượt quá 255 ký tự.' };
  }

  if (education && education.length > 255) {
    return { success: false, error: 'Trình độ học vấn không được vượt quá 255 ký tự.' };
  }

  if (bio && bio.length > 1000) {
    return { success: false, error: 'Giới thiệu bản thân không được vượt quá 1000 ký tự.' };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name,
        image,
        age,
        address,
        education,
        bio,
      },
    });

    revalidatePath('/account');
    return { success: true, message: 'Cập nhật thông tin hồ sơ thành công!' };
  } catch (error) {
    console.error('Lỗi cập nhật hồ sơ:', error);
    return { success: false, error: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.' };
  }
}

/**
 * Đổi mật khẩu tài khoản
 */
export async function changePassword(formData: FormData): Promise<ProfileActionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện.' };
  }

  const rateLimit = checkRateLimit(`change-pw:${userId}`, 5, 60);
  if (!rateLimit.success) {
    return {
      success: false,
      error: 'Bạn đã thao tác đổi mật khẩu quá nhiều lần. Vui lòng chờ 1 phút.',
    };
  }

  const currentPassword = (formData.get('currentPassword') as string) || '';
  const newPassword = (formData.get('newPassword') as string) || '';
  const confirmPassword = (formData.get('confirmPassword') as string) || '';

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Mật khẩu xác nhận không khớp với mật khẩu mới.' };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return { success: false, error: 'Không tìm thấy tài khoản.' };
    }

    // Nếu tài khoản đã có mật khẩu, bắt buộc phải nhập mật khẩu hiện tại
    if (user.password) {
      if (!currentPassword) {
        return { success: false, error: 'Vui lòng nhập mật khẩu hiện tại.' };
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await logAuditEvent({
      action: 'PASSWORD_CHANGE',
      actorId: userId,
      actorEmail: session?.user?.email ?? null,
    });

    revalidatePath('/account');
    return { success: true, message: 'Đổi mật khẩu thành công!' };
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    return { success: false, error: 'Không thể đổi mật khẩu. Vui lòng thử lại.' };
  }
}
