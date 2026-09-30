'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shortenUrlWithMonetization } from '@/lib/shortener';
import { AffiliateCategory, AffiliateLinkType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
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

  await db.affiliateItem.create({
    data: {
      name,
      slug,
      category,
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

  revalidatePath('/admin/affiliates');
  revalidatePath('/[token]', 'page');
  revalidatePath('/');
}

/**
 * Cập nhật Deal Affiliate
 */
export async function updateAffiliateItem(id: string, formData: FormData) {
  await requireAdmin();

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const category = (formData.get('category') as AffiliateCategory) || 'OTHER';
  const description = formData.get('description') as string;
  const perks = (formData.get('perks') as string) || null;
  const couponCode = (formData.get('couponCode') as string) || null;
  const directUrl = formData.get('directUrl') as string;
  const shortenedUrl = (formData.get('shortenedUrl') as string) || null;
  const activeUrlType = (formData.get('activeUrlType') as AffiliateLinkType) || 'DIRECT';
  const logoUrl = (formData.get('logoUrl') as string) || null;
  const featured = formData.get('featured') === 'true';
  const activeValue = formData.get('active');

  await db.affiliateItem.update({
    where: { id },
    data: {
      name,
      slug,
      category,
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

  revalidatePath('/admin/affiliates');
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
