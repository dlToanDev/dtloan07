'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isR2Configured, uploadToStorage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function requireProductAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') throw new Error('Bạn không có quyền quản lý sản phẩm.');
}

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  shortDesc: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1),
  version: z.string().trim().min(1).max(50),
  kind: z.enum(['SOURCE_CODE', 'SHOP']),
  saleMode: z.enum(['FREE', 'CONTACT', 'PAID']),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  priceVnd: z.coerce.number().int().min(0).max(2147483647),
  coverUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !value || value.startsWith('/') || /^https?:\/\//.test(value), {
      message: 'Ảnh bìa không hợp lệ.',
    })
    .default(''),
});

export async function saveProduct(_state: { error?: string; success?: string }, form: FormData) {
  await requireProductAdmin();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.errors[0]?.message || 'Thông tin không hợp lệ.' };
  const data = parsed.data;
  if (data.saleMode === 'PAID' && data.priceVnd <= 0)
    return { error: 'Vui lòng nhập giá bán lớn hơn 0.' };
  if (data.saleMode !== 'PAID') data.priceVnd = 0;
  const id = String(form.get('id') || '');
  const existing = id
    ? await db.product.findUnique({ where: { id }, include: { files: true } })
    : null;
  if (id && !existing) return { error: 'Không tìm thấy sản phẩm.' };
  if (existing && existing.kind !== data.kind) return { error: 'Sản phẩm thuộc mục quản lý khác.' };
  const upload = form.get('file');
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (file && file.size > 8 * 1024 * 1024)
    return { error: 'File tối đa 8 MB. Hãy nén source thành ZIP.' };
  if (data.status === 'ACTIVE' && data.saleMode !== 'CONTACT' && !file && !existing?.files.length) {
    return { error: 'Cần đính kèm file trước khi công khai sản phẩm miễn phí hoặc đặt giá.' };
  }
  if (file && !isR2Configured)
    return { error: 'Vui lòng cấu hình Cloudflare R2 trước khi upload file.' };
  let savedId = id;
  try {
    const duplicate = await db.product.findUnique({ where: { slug: data.slug } });
    if (duplicate && duplicate.id !== id) return { error: 'Slug đã được sử dụng.' };
    const storageKey = `products/${randomUUID()}`;
    if (file)
      await uploadToStorage(
        storageKey,
        Buffer.from(await file.arrayBuffer()),
        'application/octet-stream',
      );
    const files = file
      ? {
          create: {
            label: file.name,
            filename: file.name,
            storageKey,
            sizeBytes: BigInt(file.size),
            version: data.version,
          },
        }
      : undefined;
    if (existing) {
      await db.product.update({ where: { id }, data: { ...data, compareAtVnd: null, files } });
    } else {
      const created = await db.product.create({ data: { ...data, files } });
      savedId = created.id;
    }
    for (const path of [
      '/admin/source-code',
      '/admin/shop',
      '/source-code',
      '/shop',
      `/products/${data.slug}`,
      `/${data.kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${data.slug}`,
    ])
      revalidatePath(path);
    if (existing) {
      revalidatePath(`/products/${existing.slug}`);
      revalidatePath(
        `/${existing.kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${existing.slug}`,
      );
    }
    revalidatePath(
      `/admin/${data.kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${savedId}/edit`,
    );
  } catch (error) {
    console.error('Save product failed:', error);
    return { error: 'Không thể lưu sản phẩm. Vui lòng thử lại.' };
  }
  redirect(
    `/admin/${data.kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${savedId}/edit?saved=1`,
  );
}
