'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { slugifyPostTitle } from '@/lib/utils';
import { requireProductAdmin } from '@/server/actions/product';

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  hasCondition: boolean;
  sortOrder: number;
  productCount: number;
}

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nhập tên danh mục.')
  .max(60, 'Tên danh mục tối đa 60 ký tự.');

/** Slug duy nhất từ tên: "Quần áo" → "quan-ao", trùng thì thêm "-2", "-3"… */
async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugifyPostTitle(name) || 'danh-muc';
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const hit = await db.productCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
  }
}

function revalidateShop() {
  revalidatePath('/shop');
  revalidatePath('/admin/shop/categories');
}

export async function createCategory(input: {
  name: string;
  hasCondition?: boolean;
}): Promise<Result<CategoryView>> {
  await requireProductAdmin();
  const name = nameSchema.safeParse(input.name);
  if (!name.success) return { ok: false, error: name.error.errors[0]!.message };
  const duplicate = await db.productCategory.findFirst({
    where: { name: { equals: name.data, mode: 'insensitive' } },
  });
  if (duplicate) return { ok: false, error: `Đã có danh mục "${duplicate.name}".` };

  const last = await db.productCategory.aggregate({ _max: { sortOrder: true } });
  const created = await db.productCategory.create({
    data: {
      name: name.data,
      slug: await uniqueSlug(name.data),
      hasCondition: Boolean(input.hasCondition),
      sortOrder: (last._max.sortOrder ?? 0) + 10,
    },
  });
  revalidateShop();
  return { ok: true, data: { ...created, productCount: 0 } };
}

export async function updateCategory(input: {
  id: string;
  name: string;
  hasCondition: boolean;
}): Promise<Result<{ slug: string }>> {
  await requireProductAdmin();
  const name = nameSchema.safeParse(input.name);
  if (!name.success) return { ok: false, error: name.error.errors[0]!.message };
  const current = await db.productCategory.findUnique({ where: { id: input.id } });
  if (!current) return { ok: false, error: 'Không tìm thấy danh mục.' };
  const duplicate = await db.productCategory.findFirst({
    where: { name: { equals: name.data, mode: 'insensitive' }, id: { not: input.id } },
  });
  if (duplicate) return { ok: false, error: `Đã có danh mục "${duplicate.name}".` };

  const updated = await db.productCategory.update({
    where: { id: input.id },
    data: {
      name: name.data,
      hasCondition: input.hasCondition,
      // Đổi tên thì đổi luôn đường dẫn lọc cho khớp.
      ...(name.data !== current.name && { slug: await uniqueSlug(name.data, input.id) }),
    },
  });
  revalidateShop();
  return { ok: true, data: { slug: updated.slug } };
}

/** Chỉ xóa được danh mục chưa có sản phẩm, để không sản phẩm nào bị mất danh mục. */
export async function deleteCategory(id: string): Promise<Result> {
  await requireProductAdmin();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0)
    return {
      ok: false,
      error: `Danh mục đang có ${count} sản phẩm. Chuyển các sản phẩm sang danh mục khác trước khi xóa.`,
    };
  await db.productCategory.delete({ where: { id } }).catch(() => null);
  revalidateShop();
  return { ok: true, data: undefined };
}

/** Lưu thứ tự hiển thị theo danh sách id (trên cùng = đầu tiên). */
export async function reorderCategories(ids: string[]): Promise<Result> {
  await requireProductAdmin();
  await db.$transaction(
    ids.map((id, index) =>
      db.productCategory.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } }),
    ),
  );
  revalidateShop();
  return { ok: true, data: undefined };
}
