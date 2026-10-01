'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { type HeroBannerConfig, DEFAULT_HERO_BANNER_CONFIG } from '@/config/hero-banner';

const ADS_DIR = path.join(process.cwd(), 'public', 'images', 'ads');
const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

import { getCurrentUserData } from '@/lib/current-user';

/** Tự động deduplicate kiểm tra quyền PRO trong cùng một request (tránh query DB nhiều lần) */
const checkIsUserPro = async (): Promise<boolean> => {
  const userData = await getCurrentUserData();
  return userData?.isPro ?? false;
};

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

const getPublicLoginAdConfigCached = unstable_cache(
  async (): Promise<LoginAdConfig | null> => {
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
  },
  ['public-login-ad-config'],
  { revalidate: 300, tags: ['settings', 'login-ad'] },
);

/** Lấy cấu hình quảng cáo công khai cho client popup (Không cần đăng nhập admin) */
export async function getPublicLoginAdConfig(): Promise<LoginAdConfig | null> {
  return getPublicLoginAdConfigCached();
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

    revalidateTag('settings');
    revalidateTag('login-ad');
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
  detailContent?: string | null;
  voucherCode?: string | null;
  voucherDiscount?: string | null;
  voucherExpires?: Date | null;
  gameType?: string | null;
  gameConfig?: string | null;
  isActive: boolean;
  showBanner: boolean;
  proOnly: boolean;
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
  detailContent: z.string().trim().optional().nullable(),
  voucherCode: z.string().trim().max(50).optional().nullable(),
  voucherDiscount: z.string().trim().max(50).optional().nullable(),
  gameType: z.string().trim().optional().nullable(),
  gameConfig: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
  showBanner: z.boolean().default(true),
  proOnly: z.boolean().default(false),
  syncShopCoupon: z.boolean().default(false).optional(),
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

const getProBannerAnnouncementCached = unstable_cache(
  async (): Promise<AnnouncementItem | null> => {
    return db.systemAnnouncement.findFirst({
      where: {
        isActive: true,
        showBanner: true,
        proOnly: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['pro-banner-announcement'],
  { revalidate: 120, tags: ['announcements'] },
);

const getPublicBannerAnnouncementCached = unstable_cache(
  async (): Promise<AnnouncementItem | null> => {
    return db.systemAnnouncement.findFirst({
      where: {
        isActive: true,
        showBanner: true,
        proOnly: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['public-banner-announcement'],
  { revalidate: 120, tags: ['announcements'] },
);

/** Lấy thông báo banner đang kích hoạt gần nhất để hiển thị thanh top banner */
export async function getActiveBannerAnnouncement(): Promise<AnnouncementItem | null> {
  try {
    const isUserPro = await checkIsUserPro();

    // Nếu là thành viên PRO, ưu tiên hiển thị banner đặc quyền dành riêng cho PRO trước
    if (isUserPro) {
      const proBanner = await getProBannerAnnouncementCached();
      if (proBanner) return proBanner;
    }

    // Hiển thị banner chung công khai (chưa/không phải Pro hoặc không có banner Pro riêng)
    return await getPublicBannerAnnouncementCached();
  } catch {
    return null;
  }
}

const getProActiveAnnouncementsCached = unstable_cache(
  async (): Promise<AnnouncementItem[]> => {
    return db.systemAnnouncement.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  },
  ['pro-active-announcements'],
  { revalidate: 120, tags: ['announcements'] },
);

const getPublicActiveAnnouncementsCached = unstable_cache(
  async (): Promise<AnnouncementItem[]> => {
    return db.systemAnnouncement.findMany({
      where: {
        isActive: true,
        proOnly: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  },
  ['public-active-announcements'],
  { revalidate: 120, tags: ['announcements'] },
);

/** Lấy danh sách các thông báo hệ thống đang kích hoạt để hiển thị trong chuông thông báo (Notification Bell) */
export async function getPublicActiveAnnouncements(): Promise<AnnouncementItem[]> {
  try {
    const isUserPro = await checkIsUserPro();

    // Tài khoản PRO và ADMIN xem được cả thông báo chung lẫn thông báo dành riêng cho PRO
    // Khách vãng lai và tài khoản thường CHỈ xem được thông báo proOnly = false
    if (isUserPro) {
      return await getProActiveAnnouncementsCached();
    }
    return await getPublicActiveAnnouncementsCached();
  } catch (err) {
    console.error('Lỗi lấy thông báo chuông:', err);
    return [];
  }
}

export type AnnouncementInput = z.input<typeof announcementSchema>;

/** Tạo thông báo hệ thống mới (VD: Sản phẩm mới, Voucher ưu đãi, Cập nhật tính năng) */
export async function createAnnouncement(
  data: AnnouncementInput,
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
        detailContent: validated.data.detailContent || null,
        voucherCode: validated.data.voucherCode || null,
        voucherDiscount: validated.data.voucherDiscount || null,
        gameType: validated.data.gameType || null,
        gameConfig: validated.data.gameConfig || null,
        isActive: validated.data.isActive,
        showBanner: validated.data.showBanner,
        proOnly: validated.data.proOnly ?? false,
      },
    });

    // Đồng bộ tạo Voucher trong Shop nếu Admin tích chọn và có nhập mã voucher
    if (validated.data.syncShopCoupon && validated.data.voucherCode) {
      try {
        const normCode = validated.data.voucherCode.toUpperCase().trim();
        const existingCoupon = await db.coupon.findUnique({
          where: { code: normCode },
        });

        if (!existingCoupon) {
          const discountStr = validated.data.voucherDiscount || '';
          const numMatch = discountStr.match(/\d+/);
          const rawNum = numMatch ? parseInt(numMatch[0], 10) : 20;
          const isPercent =
            discountStr.includes('%') ||
            (rawNum >= 1 &&
              rawNum <= 100 &&
              !discountStr.toLowerCase().includes('k') &&
              !discountStr.toLowerCase().includes('đ'));

          await db.coupon.create({
            data: {
              code: normCode,
              name: validated.data.title,
              type: isPercent ? 'PERCENT' : 'FIXED',
              value: isPercent ? rawNum : rawNum < 1000 ? rawNum * 1000 : rawNum,
              proOnly: validated.data.proOnly ?? false,
              active: true,
            },
          });
          revalidatePath('/admin/vouchers');
        }
      } catch (couponErr) {
        console.warn('Lỗi tự động tạo coupon từ thông báo:', couponErr);
      }
    }

    revalidateTag('announcements');
    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return { success: true, item: created };
  } catch (err) {
    console.error('Lỗi tạo thông báo:', err);
    return { success: false, error: 'Không thể tạo thông báo. Vui lòng thử lại.' };
  }
}

/** Lấy chi tiết 1 thông báo hệ thống (kèm nội dung bài viết và mini game) */
export async function getAnnouncementById(id: string): Promise<AnnouncementItem | null> {
  try {
    const item = await db.systemAnnouncement.findUnique({
      where: { id },
    });
    if (!item) return null;

    // Nếu thông báo dành riêng cho PRO, kiểm tra quyền xem
    if (item.proOnly) {
      const isUserPro = await checkIsUserPro();
      if (!isUserPro) return null;
    }

    return item;
  } catch (err) {
    console.error('Lỗi lấy thông báo theo ID:', err);
    return null;
  }
}

/** Cập nhật thông báo hệ thống */
export async function updateAnnouncement(
  id: string,
  data: Partial<AnnouncementInput>,
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
        ...(data.detailContent !== undefined && {
          detailContent: data.detailContent ? data.detailContent.trim() : null,
        }),
        ...(data.voucherCode !== undefined && {
          voucherCode: data.voucherCode ? data.voucherCode.trim() : null,
        }),
        ...(data.voucherDiscount !== undefined && {
          voucherDiscount: data.voucherDiscount ? data.voucherDiscount.trim() : null,
        }),
        ...(data.gameType !== undefined && { gameType: data.gameType }),
        ...(data.gameConfig !== undefined && { gameConfig: data.gameConfig }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.showBanner !== undefined && { showBanner: data.showBanner }),
        ...(data.proOnly !== undefined && { proOnly: data.proOnly }),
      },
    });

    revalidateTag('announcements');
    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return { success: true };
  } catch (err) {
    console.error('Lỗi cập nhật thông báo:', err);
    return { success: false, error: 'Không thể cập nhật thông báo.' };
  }
}

/** Bật/tắt nhanh trạng thái hoạt động, banner hoặc chế độ PRO Only */
export async function toggleAnnouncementState(
  id: string,
  field: 'isActive' | 'showBanner' | 'proOnly',
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

    revalidateTag('announcements');
    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');

    return { success: true, newValue: nextVal };
  } catch (err) {
    console.error('Lỗi chuyển trạng thái thông báo:', err);
    return { success: false, error: 'Không thể cập nhật.' };
  }
}

/** Lấy danh sách voucher trong Shop để gợi ý khi tạo thông báo */
export async function getProCouponsForAnnouncement(): Promise<
  Array<{
    id: string;
    code: string | null;
    name: string;
    type: string;
    value: number;
    maxDiscountVnd: number | null;
    endsAt: Date | null;
    proOnly: boolean;
  }>
> {
  await requireAdmin();
  try {
    const coupons = await db.coupon.findMany({
      where: { active: true },
      orderBy: [{ proOnly: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        value: true,
        maxDiscountVnd: true,
        endsAt: true,
        proOnly: true,
      },
      take: 50,
    });
    return coupons;
  } catch (err) {
    console.error('Lỗi lấy danh sách coupon:', err);
    return [];
  }
}

/** Xóa thông báo */
export async function deleteAnnouncement(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await db.systemAnnouncement.delete({ where: { id } });
    revalidateTag('announcements');
    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err) {
    console.error('Lỗi xóa thông báo:', err);
    return { success: false, error: 'Không thể xóa thông báo.' };
  }
}

// -----------------------------------------------------------------------------
// 3. QUẢN LÝ BANNER QUẢNG CÁO TRANG CHỦ (HERO BANNER CAROUSEL)
// -----------------------------------------------------------------------------

const heroBannerItemSchema = z.object({
  id: z.string().default(() => randomUUID()),
  title: z.string().trim().max(120, 'Tiêu đề banner tối đa 120 ký tự.').default(''),
  subtitle: z.string().trim().max(250).optional().default(''),
  imageUrl: z.string().trim().min(1, 'Đường dẫn ảnh banner không được để trống.'),
  linkUrl: z.string().trim().max(500).default('#'),
  active: z.boolean().default(true),
  badge: z.string().trim().max(40).optional().default(''),
  ctaText: z.string().trim().max(40).optional().default('Xem ngay'),
  targetBlank: z.boolean().default(true),
});

const heroBannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoPlay: z.boolean().default(true),
  intervalSeconds: z.number().int().min(2).max(30).default(5),
  banners: z.array(heroBannerItemSchema).default([]),
});

const SETTING_KEY_HERO_BANNER = 'hero_banner_config';

/** Lấy cấu hình banner quảng cáo trang chủ cho Admin */
export async function getHeroBannerConfig(): Promise<HeroBannerConfig> {
  await requireAdmin();
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY_HERO_BANNER },
    });
    if (!row?.value) {
      return DEFAULT_HERO_BANNER_CONFIG;
    }
    const parsed = JSON.parse(row.value) as Partial<HeroBannerConfig>;
    return {
      ...DEFAULT_HERO_BANNER_CONFIG,
      ...parsed,
      banners:
        parsed.banners && parsed.banners.length > 0
          ? parsed.banners
          : DEFAULT_HERO_BANNER_CONFIG.banners,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error('Lỗi đọc cấu hình banner quảng cáo:', err);
    return DEFAULT_HERO_BANNER_CONFIG;
  }
}

const getPublicHeroBannerConfigCached = unstable_cache(
  async (): Promise<HeroBannerConfig> => {
    try {
      const row = await db.systemSetting.findUnique({
        where: { key: SETTING_KEY_HERO_BANNER },
      });
      if (!row?.value) {
        return DEFAULT_HERO_BANNER_CONFIG;
      }
      const parsed = JSON.parse(row.value) as Partial<HeroBannerConfig>;
      return {
        ...DEFAULT_HERO_BANNER_CONFIG,
        ...parsed,
        banners:
          parsed.banners && parsed.banners.length > 0
            ? parsed.banners
            : DEFAULT_HERO_BANNER_CONFIG.banners,
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('Lỗi đọc public cấu hình banner quảng cáo:', err);
      return DEFAULT_HERO_BANNER_CONFIG;
    }
  },
  ['public-hero-banner-config'],
  { revalidate: 300, tags: ['settings', 'hero-banner'] },
);

/** Lấy cấu hình banner quảng cáo công khai cho trang chủ (Client / Server Component) */
export async function getPublicHeroBannerConfig(): Promise<HeroBannerConfig> {
  return getPublicHeroBannerConfigCached();
}

/** Lưu cấu hình banner quảng cáo trang chủ */
export async function saveHeroBannerConfig(
  input: HeroBannerConfig,
): Promise<{ success: boolean; config?: HeroBannerConfig; error?: string }> {
  await requireAdmin();

  const parsed = heroBannerConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dữ liệu cấu hình banner không hợp lệ.',
    };
  }

  try {
    const value = JSON.stringify(parsed.data);
    const row = await db.systemSetting.upsert({
      where: { key: SETTING_KEY_HERO_BANNER },
      update: { value },
      create: { key: SETTING_KEY_HERO_BANNER, value },
    });

    revalidateTag('settings');
    revalidateTag('hero-banner');
    revalidatePath('/');
    revalidatePath('/admin/settings');

    return {
      success: true,
      config: {
        ...parsed.data,
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error('Lỗi lưu cấu hình banner quảng cáo:', err);
    return {
      success: false,
      error: 'Không thể lưu cấu hình banner vào cơ sở dữ liệu.',
    };
  }
}
