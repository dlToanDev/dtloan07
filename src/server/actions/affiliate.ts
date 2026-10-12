'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shortenUrlWithMonetization } from '@/lib/shortener';
import { AffiliateCategory, AffiliateLinkType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AFFILIATE_IMG_DIR = path.join(process.cwd(), 'public', 'images', 'affiliates');
const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

/**
 * Upload ảnh sản phẩm affiliate từ máy lên thư mục public/images/affiliates/
 */
export async function uploadAffiliateImage(
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Vui lòng chọn một tệp hình ảnh để tải lên.' };
  }

  // Tối đa 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'Ảnh vượt quá dung lượng tối đa (5 MB).' };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) {
    return {
      success: false,
      error: 'Chỉ chấp nhận các định dạng ảnh: PNG, JPG, JPEG, WebP, SVG, GIF, AVIF.',
    };
  }

  const cleanName = path
    .basename(file.name, ext)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);
  const fileName = `aff-${cleanName || 'item'}-${Date.now()}-${randomUUID().slice(0, 6)}${ext}`;
  const targetPath = path.join(AFFILIATE_IMG_DIR, fileName);

  try {
    await mkdir(AFFILIATE_IMG_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);
    return { success: true, url: `/images/affiliates/${fileName}` };
  } catch (err) {
    console.error('Lỗi lưu ảnh affiliate:', err);
    return {
      success: false,
      error:
        'Không thể lưu file ảnh lên máy chủ. Vui lòng kiểm tra quyền thư mục public/images/affiliates.',
    };
  }
}

/**
 * Server Action gọi API rút gọn link kiếm tiền
 */
export async function generateShortUrlAction(targetUrl: string) {
  await requireAdmin();
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { success: false, error: 'URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)' };
  }
  return await shortenUrlWithMonetization(targetUrl);
}

/**
 * Tạo mới Deal Affiliate
 */
export async function createAffiliateItem(formData: FormData) {
  await requireAdmin();

  const name = formData.get('name') as string;
  let slug = formData.get('slug') as string;
  const category = (formData.get('category') as AffiliateCategory) || 'OTHER';
  const subCategory = (formData.get('subCategory') as string)?.trim() || null;
  const platform = (formData.get('platform') as string)?.trim() || null;
  const description = formData.get('description') as string;
  const perks = (formData.get('perks') as string) || null;
  const couponCode = (formData.get('couponCode') as string) || null;
  const directUrl = formData.get('directUrl') as string;
  const shortenedUrl = (formData.get('shortenedUrl') as string) || null;
  const activeUrlType = (formData.get('activeUrlType') as AffiliateLinkType) || 'DIRECT';
  const logoUrl = (formData.get('logoUrl') as string) || null;
  const featured = formData.get('featured') === 'true';
  const active = formData.get('active') !== 'false';

  if (!name || !directUrl) {
    throw new Error('Vui lòng nhập đầy đủ tên dịch vụ và link affiliate gốc.');
  }

  // Tự sinh slug nếu để trống
  if (!slug) {
    slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  if (!slug) {
    slug = `deal-${Date.now()}`;
  }

  // Tự động phân giải trùng lặp slug (tránh lỗi Unique Constraint)
  let candidateSlug = slug;
  let counter = 1;
  while (await db.affiliateItem.findUnique({ where: { slug: candidateSlug } })) {
    candidateSlug = `${slug}-${counter}`;
    counter++;
  }
  slug = candidateSlug;

  try {
    await db.affiliateItem.create({
      data: {
        name,
        slug,
        category,
        subCategory,
        platform,
        description: description || '',
        perks,
        couponCode,
        directUrl,
        shortenedUrl,
        activeUrlType,
        logoUrl,
        featured,
        active,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Lỗi khi tạo sản phẩm Affiliate:', errorMsg);
    throw new Error(`Không thể lưu sản phẩm affiliate: ${errorMsg}`);
  }

  revalidatePath('/admin/affiliates');
  revalidatePath('/admin/affiliate-shopping');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}

/**
 * Cập nhật Deal Affiliate
 */
export async function updateAffiliateItem(id: string, formData: FormData) {
  await requireAdmin();

  const name = formData.get('name') as string;
  let slug = formData.get('slug') as string;
  const category = (formData.get('category') as AffiliateCategory) || 'OTHER';
  const subCategory = (formData.get('subCategory') as string)?.trim() || null;
  const platform = (formData.get('platform') as string)?.trim() || null;
  const description = formData.get('description') as string;
  const perks = (formData.get('perks') as string) || null;
  const couponCode = (formData.get('couponCode') as string) || null;
  const directUrl = formData.get('directUrl') as string;
  const shortenedUrl = (formData.get('shortenedUrl') as string) || null;
  const activeUrlType = (formData.get('activeUrlType') as AffiliateLinkType) || 'DIRECT';
  const logoUrl = (formData.get('logoUrl') as string) || null;
  const featured = formData.get('featured') === 'true';
  const activeValue = formData.get('active');

  if (!slug && name) {
    slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  // Đảm bảo slug không bị trùng lặp với item khác
  if (slug) {
    let candidateSlug = slug;
    let counter = 1;
    while (true) {
      const existing = await db.affiliateItem.findUnique({ where: { slug: candidateSlug } });
      if (!existing || existing.id === id) break;
      candidateSlug = `${slug}-${counter}`;
      counter++;
    }
    slug = candidateSlug;
  }

  try {
    await db.affiliateItem.update({
      where: { id },
      data: {
        name,
        slug,
        category,
        subCategory,
        platform,
        description: description || '',
        perks,
        couponCode,
        directUrl,
        shortenedUrl,
        activeUrlType,
        logoUrl,
        featured,
        ...(activeValue !== null && { active: activeValue === 'true' }),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Lỗi khi cập nhật sản phẩm Affiliate:', errorMsg);
    throw new Error(`Không thể cập nhật sản phẩm: ${errorMsg}`);
  }

  revalidatePath('/admin/affiliates');
  revalidatePath('/admin/affiliate-shopping');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}

/**
 * Xóa Deal Affiliate
 */
export async function deleteAffiliateItem(id: string) {
  await requireAdmin();
  await db.affiliateItem.delete({ where: { id } });
  revalidatePath('/admin/affiliates');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}

/**
 * Bật/Tắt trạng thái hoạt động
 */
export async function toggleAffiliateStatus(id: string, currentActive: boolean) {
  await requireAdmin();
  await db.affiliateItem.update({
    where: { id },
    data: { active: !currentActive },
  });
  revalidatePath('/admin/affiliates');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}

/**
 * Bật/Tắt ghim lên Trang Chủ
 */
export async function toggleAffiliateFeatured(id: string, currentFeatured: boolean) {
  await requireAdmin();
  await db.affiliateItem.update({
    where: { id },
    data: { featured: !currentFeatured },
  });
  revalidatePath('/admin/affiliates');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}

/**
 * Đổi loại link kích hoạt (DIRECT hoặc SHORTENED)
 */
export async function setAffiliateActiveLinkType(id: string, newType: AffiliateLinkType) {
  await requireAdmin();
  await db.affiliateItem.update({
    where: { id },
    data: { activeUrlType: newType },
  });
  revalidatePath('/admin/affiliates');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}
