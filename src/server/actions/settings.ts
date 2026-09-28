'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const ADS_DIR = path.join(process.cwd(), 'public', 'images', 'ads');
const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

// -----------------------------------------------------------------------------
// 1. CẤU HÌNH QUẢNG CÁO ĐĂNG NHẬP (LOGIN AD POPUP)
// -----------------------------------------------------------------------------

export interface LoginAdConfig {
  enabled: boolean;
  imageUrl: string;
  title: string;
  linkUrl: string;
  countdownSeconds: number; // Mặc định 5s
  targetAudience: 'authenticated' | 'all'; // Đăng nhập mới thấy hay tất cả
  frequency: 'once_per_session' | 'every_login' | 'once_per_day';
  updatedAt?: string;
}

const DEFAULT_LOGIN_AD_CONFIG: LoginAdConfig = {
  enabled: false,
  imageUrl: '',
  title: 'Khám phá ưu đãi đặc biệt hôm nay!',
  linkUrl: '',
  countdownSeconds: 5,
  targetAudience: 'authenticated',
  frequency: 'once_per_session',
};

const loginAdSchema = z.object({
  enabled: z.boolean(),
  imageUrl: z.string().trim().url('Đường dẫn ảnh quảng cáo không hợp lệ.').or(z.literal('')),
  title: z.string().trim().max(120, 'Tiêu đề quảng cáo tối đa 120 ký tự.').default(''),
  linkUrl: z.string().trim().max(500).default(''),
  countdownSeconds: z.number().int().min(1).max(30).default(5),
  targetAudience: z.enum(['authenticated', 'all']).default('authenticated'),
  frequency: z
    .enum(['once_per_session', 'every_login', 'once_per_day'])
    .default('once_per_session'),
});

const SETTING_KEY_LOGIN_AD = 'login_ad_popup_config';

/** Lấy cấu hình quảng cáo cho trang quản trị (Admin) */
export async function getLoginAdConfig(): Promise<LoginAdConfig> {
  await requireAdmin();
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY_LOGIN_AD },
    });
    if (!row?.value) {
      return DEFAULT_LOGIN_AD_CONFIG;
    }
    const parsed = JSON.parse(row.value) as Partial<LoginAdConfig>;
    return {
      ...DEFAULT_LOGIN_AD_CONFIG,
      ...parsed,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error('Lỗi đọc cấu hình quảng cáo:', err);
    return DEFAULT_LOGIN_AD_CONFIG;
  }
}

/** Lấy cấu hình quảng cáo công khai cho client popup (Không cần đăng nhập admin) */
export async function getPublicLoginAdConfig(): Promise<LoginAdConfig | null> {
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY_LOGIN_AD },
    });
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as LoginAdConfig;
    if (!parsed.enabled || !parsed.imageUrl) return null;
    return {
      ...DEFAULT_LOGIN_AD_CONFIG,
      ...parsed,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/** Lưu cấu hình quảng cáo popup */
export async function saveLoginAdConfig(
  input: LoginAdConfig,
): Promise<{ success: boolean; error?: string; config?: LoginAdConfig }> {
  await requireAdmin();

  const validated = loginAdSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || 'Dữ liệu không hợp lệ.',
    };
  }

  if (validated.data.enabled && !validated.data.imageUrl) {
    return {
      success: false,
      error: 'Vui lòng cung cấp hình ảnh quảng cáo hoặc tải ảnh lên trước khi bật.',
    };
  }

  try {
    const payload = JSON.stringify(validated.data);
    const updated = await db.systemSetting.upsert({
      where: { key: SETTING_KEY_LOGIN_AD },
      update: { value: payload },
      create: { key: SETTING_KEY_LOGIN_AD, value: payload },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return {
      success: true,
      config: {
        ...validated.data,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error('Lỗi lưu cấu hình quảng cáo:', err);
    return { success: false, error: 'Không thể lưu cấu hình. Vui lòng thử lại.' };
  }
}

/** Upload ảnh quảng cáo lên máy chủ (lưu vào /public/images/ads/) */
export async function uploadAdImage(
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Vui lòng chọn một tệp ảnh quảng cáo để tải lên.' };
  }

  // Tối đa 8 MB
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: 'Ảnh vượt quá dung lượng tối đa (8 MB).' };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) {
    return {
      success: false,
      error: 'Chỉ chấp nhận các định dạng ảnh: PNG, JPG, JPEG, WebP, SVG, GIF, AVIF.',
    };
  }

  const fileName = `ad-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const targetPath = path.join(ADS_DIR, fileName);

  try {
    await mkdir(ADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);
    return { success: true, url: `/images/ads/${fileName}` };
  } catch (err) {
    console.error('Lỗi lưu ảnh quảng cáo:', err);
    return {
      success: false,
      error: 'Không thể lưu file ảnh. Vui lòng kiểm tra quyền thư mục public/images/ads.',
    };
  }
}

// -----------------------------------------------------------------------------
// 2. QUẢN LÝ THÔNG BÁO TÍNH NĂNG HỆ THỐNG (SYSTEM ANNOUNCEMENTS)
// -----------------------------------------------------------------------------

export type AnnouncementType = 'NEW_PRODUCT' | 'VOUCHER' | 'FEATURE' | 'MAINTENANCE' | 'GENERAL';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  badge: string | null;
  linkUrl: string | null;
  linkText: string | null;
  isActive: boolean;
  showBanner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = z.object({
  title: z.string().trim().min(2, 'Tiêu đề thông báo ít nhất 2 ký tự.').max(150),
  content: z.string().trim().min(5, 'Nội dung thông báo ít nhất 5 ký tự.').max(1000),
  type: z.enum(['NEW_PRODUCT', 'VOUCHER', 'FEATURE', 'MAINTENANCE', 'GENERAL']),
  badge: z.string().trim().max(30).optional().nullable(),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  linkText: z.string().trim().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
  showBanner: z.boolean().default(true),
});

/** Lấy tất cả thông báo hệ thống cho trang quản trị */
export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  await requireAdmin();
  try {
    const list = await db.systemAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list;
  } catch (err) {
    console.error('Lỗi lấy danh sách thông báo:', err);
    return [];
  }
}

/** Lấy thông báo banner đang kích hoạt gần nhất để hiển thị thanh top banner */
export async function getActiveBannerAnnouncement(): Promise<AnnouncementItem | null> {
  try {
    const item = await db.systemAnnouncement.findFirst({
      where: {
        isActive: true,
        showBanner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return item;
  } catch {
    return null;
  }
}

/** Lấy danh sách các thông báo hệ thống đang kích hoạt để hiển thị trong chuông thông báo (Notification Bell) */
export async function getPublicActiveAnnouncements(): Promise<AnnouncementItem[]> {
  try {
    const list = await db.systemAnnouncement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return list;
  } catch (err) {
    console.error('Lỗi lấy thông báo chuông:', err);
    return [];
  }
}

/** Tạo thông báo hệ thống mới (VD: Sản phẩm mới, Voucher ưu đãi, Cập nhật tính năng) */
export async function createAnnouncement(
  data: z.infer<typeof announcementSchema>,
): Promise<{ success: boolean; error?: string; item?: AnnouncementItem }> {
  await requireAdmin();

  const validated = announcementSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message };
  }

  try {
    const created = await db.systemAnnouncement.create({
      data: {
        title: validated.data.title,
        content: validated.data.content,
        type: validated.data.type,
        badge: validated.data.badge || null,
        linkUrl: validated.data.linkUrl || null,
        linkText: validated.data.linkText || 'Xem ngay',
        isActive: validated.data.isActive,
        showBanner: validated.data.showBanner,
      },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return { success: true, item: created };
  } catch (err) {
    console.error('Lỗi tạo thông báo:', err);
    return { success: false, error: 'Không thể tạo thông báo. Vui lòng thử lại.' };
  }
}

/** Cập nhật thông báo hệ thống */
export async function updateAnnouncement(
  id: string,
  data: Partial<z.infer<typeof announcementSchema>>,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await db.systemAnnouncement.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.content !== undefined && { content: data.content.trim() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.badge !== undefined && { badge: data.badge ? data.badge.trim() : null }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl ? data.linkUrl.trim() : null }),
        ...(data.linkText !== undefined && {
          linkText: data.linkText ? data.linkText.trim() : null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.showBanner !== undefined && { showBanner: data.showBanner }),
      },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return { success: true };
  } catch (err) {
    console.error('Lỗi cập nhật thông báo:', err);
    return { success: false, error: 'Không thể cập nhật thông báo.' };
  }
}

/** Bật/tắt nhanh trạng thái hoạt động hoặc thanh banner */
export async function toggleAnnouncementState(
  id: string,
  field: 'isActive' | 'showBanner',
): Promise<{ success: boolean; error?: string; newValue?: boolean }> {
  await requireAdmin();

  try {
    const current = await db.systemAnnouncement.findUnique({
      where: { id },
      select: { [field]: true },
    });

    if (!current) {
      return { success: false, error: 'Thông báo không tồn tại.' };
    }

    const nextVal = !current[field];
    await db.systemAnnouncement.update({
      where: { id },
      data: { [field]: nextVal },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return { success: true, newValue: nextVal };
  } catch (err) {
    console.error('Lỗi chuyển trạng thái thông báo:', err);
    return { success: false, error: 'Không thể cập nhật.' };
  }
}

/** Xóa thông báo */
export async function deleteAnnouncement(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await db.systemAnnouncement.delete({ where: { id } });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err) {
    console.error('Lỗi xóa thông báo:', err);
    return { success: false, error: 'Không thể xóa thông báo.' };
  }
}
