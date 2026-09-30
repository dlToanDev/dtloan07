'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { isValidProvince } from '@/config/provinces';

const MAX_INT = 2147483647;

const zoneSchema = z.object({
  id: z.string().trim().optional().default(''),
  name: z.string().trim().min(1, 'Tên khu vực không được để trống.').max(100),
  feeVnd: z.coerce.number().int().min(0, 'Phí ship không được âm.').max(MAX_INT),
  freeShipFromVnd: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().min(0).max(MAX_INT).nullable(),
  ),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type ShippingZoneState = { error?: string; success?: string };

/** Tạo mới hoặc cập nhật một khu vực ship. Khu mặc định không đổi được cờ isDefault. */
export async function saveShippingZone(
  _state: ShippingZoneState,
  form: FormData,
): Promise<ShippingZoneState> {
  await requireProductAdmin();

  const parsed = zoneSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Thông tin khu vực không hợp lệ.' };
  }
  const { id, name, feeVnd, freeShipFromVnd, sortOrder } = parsed.data;

  const provinces = form
    .getAll('provinces')
    .map(String)
    .filter((code) => isValidProvince(code));

  try {
    if (id) {
      const existing = await db.shippingZone.findUnique({ where: { id } });
      if (!existing) return { error: 'Không tìm thấy khu vực.' };
      await db.shippingZone.update({
        where: { id },
        data: {
          name,
          feeVnd,
          freeShipFromVnd,
          sortOrder,
          // Khu mặc định bao phủ mọi tỉnh chưa được gán nên không giữ danh sách tỉnh.
          provinces: existing.isDefault ? [] : provinces,
        },
      });
    } else {
      await db.shippingZone.create({
        data: { name, feeVnd, freeShipFromVnd, sortOrder, provinces, isDefault: false },
      });
    }
  } catch (error) {
    console.error('Lưu khu vực ship thất bại:', error);
    return { error: 'Không thể lưu khu vực. Vui lòng thử lại.' };
  }

  revalidatePath('/admin/shop/shipping');
  return { success: id ? 'Đã cập nhật khu vực.' : 'Đã thêm khu vực mới.' };
}

export async function deleteShippingZone(
  _state: ShippingZoneState,
  form: FormData,
): Promise<ShippingZoneState> {
  await requireProductAdmin();
  const id = String(form.get('id') || '');
  if (!id) return { error: 'Thiếu mã khu vực.' };

  const zone = await db.shippingZone.findUnique({ where: { id } });
  if (!zone) return { error: 'Không tìm thấy khu vực.' };
  if (zone.isDefault) return { error: 'Không thể xóa khu vực mặc định.' };

  await db.shippingZone.delete({ where: { id } });
  revalidatePath('/admin/shop/shipping');
  return { success: 'Đã xóa khu vực.' };
}
