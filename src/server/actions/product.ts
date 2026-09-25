'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isR2Configured, uploadToStorage } from '@/lib/storage';
import { parseVariantsInput, planVariantSync, type VariantInput } from '@/lib/shop/variant-input';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function requireProductAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') throw new Error('Bạn không có quyền quản lý sản phẩm.');
}

const optionalEnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

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

  // --- Shop ---
  type: z.enum(['DOWNLOAD', 'PHYSICAL', 'ACCOUNT']).default('DOWNLOAD'),
  category: optionalEnum(
    z.enum(['APPAREL', 'HAT', 'MUG', 'ACCESSORY', 'TECH', 'ACCOUNT', 'OTHER']),
  ),
  condition: optionalEnum(z.enum(['NEW', 'LIKE_NEW', 'USED'])),
  conditionNote: z.string().trim().max(300).optional().default(''),
  warrantyNote: z.string().trim().max(300).optional().default(''),
  deliveryMode: optionalEnum(z.enum(['AUTO', 'MANUAL'])),
});

const gallerySchema = z
  .array(
    z
      .string()
      .trim()
      .max(500)
      .refine((url) => url.startsWith('/') || /^https?:\/\//.test(url)),
  )
  .max(20);

export async function saveProduct(_state: { error?: string; success?: string }, form: FormData) {
  await requireProductAdmin();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.errors[0]?.message || 'Thông tin không hợp lệ.' };
  const data = parsed.data;

  // Hàng Shop cần giao (đồ vật lý / tài khoản số) dùng biến thể để quyết định giá,
  // còn hàng file tải về giữ nguyên luồng saleMode + priceVnd như trước.
  const isShopGoods = data.kind === 'SHOP' && data.type !== 'DOWNLOAD';
  if (data.kind === 'SOURCE_CODE') data.type = 'DOWNLOAD';
  if (data.kind === 'SHOP' && !data.category) return { error: 'Vui lòng chọn danh mục.' };
  if (data.type === 'ACCOUNT' && !data.deliveryMode)
    return { error: 'Vui lòng chọn cách bàn giao tài khoản.' };

  let gallery: string[] = [];
  try {
    gallery = gallerySchema.parse(JSON.parse(String(form.get('gallery') || '[]')));
  } catch {
    return { error: 'Danh sách ảnh không hợp lệ.' };
  }

  let variantInputs: VariantInput[];
  if (isShopGoods) {
    const parsedVariants = parseVariantsInput(form.get('variants'));
    if (!parsedVariants.ok) return { error: parsedVariants.error };
    variantInputs = parsedVariants.variants;
    data.saleMode = 'PAID';
    const active = variantInputs.filter((variant) => variant.active);
    if (data.status === 'ACTIVE' && !active.some((variant) => variant.priceVnd > 0))
      return { error: 'Cần ít nhất 1 biến thể đang bán có giá lớn hơn 0 trước khi đăng.' };
    // Giá sản phẩm là giá biến thể rẻ nhất — dùng để sắp xếp và hiển thị "từ X đ".
    const cheapest = [...active].sort((a, b) => a.priceVnd - b.priceVnd)[0];
    data.priceVnd = cheapest?.priceVnd ?? 0;
  } else {
    if (data.saleMode === 'PAID' && data.priceVnd <= 0)
      return { error: 'Vui lòng nhập giá bán lớn hơn 0.' };
    if (data.saleMode !== 'PAID') data.priceVnd = 0;
    variantInputs = [
      {
        name: 'Mặc định',
        sku: null,
        priceVnd: data.priceVnd,
        compareAtVnd: null,
        stock: null,
        active: true,
      },
    ];
  }

  const cheapestActive = [...variantInputs.filter((variant) => variant.active)].sort(
    (a, b) => a.priceVnd - b.priceVnd,
  )[0];

  const shopFields = {
    type: data.type,
    category: data.kind === 'SHOP' ? (data.category ?? null) : null,
    condition: data.category === 'TECH' ? (data.condition ?? null) : null,
    conditionNote: data.category === 'TECH' ? data.conditionNote || null : null,
    warrantyNote: data.warrantyNote || null,
    deliveryMode: data.type === 'ACCOUNT' ? (data.deliveryMode ?? null) : null,
    gallery,
    compareAtVnd: isShopGoods ? (cheapestActive?.compareAtVnd ?? null) : null,
  };

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
  if (
    data.status === 'ACTIVE' &&
    !isShopGoods &&
    data.saleMode !== 'CONTACT' &&
    !file &&
    !existing?.files.length
  ) {
    return { error: 'Cần đính kèm file trước khi công khai sản phẩm miễn phí hoặc đặt giá.' };
  }
  if (file && !isR2Configured)
    return { error: 'Vui lòng cấu hình Cloudflare R2 trước khi upload file.' };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    type: _type,
    category: _category,
    condition: _condition,
    conditionNote: _conditionNote,
    warrantyNote: _warrantyNote,
    deliveryMode: _deliveryMode,
    ...baseData
  } = data;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const productData = { ...baseData, ...shopFields };

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
      await db.product.update({ where: { id }, data: { ...productData, files } });
    } else {
      const created = await db.product.create({ data: { ...productData, files } });
      savedId = created.id;
    }

    // Đồng bộ biến thể: tạo mới, cập nhật, ẩn (đã có đơn) hoặc xóa (chưa bán).
    const existingVariants = await db.productVariant.findMany({
      where: { productId: savedId },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    // Sản phẩm file tải về: giữ id của biến thể "Mặc định" hiện có để không đứt đơn cũ.
    if (!isShopGoods && existingVariants[0] && variantInputs[0])
      variantInputs[0] = { ...variantInputs[0], id: existingVariants[0].id };
    const plan = planVariantSync(
      existingVariants.map((variant) => ({
        id: variant.id,
        hasOrders: variant._count.orderItems > 0,
      })),
      variantInputs,
    );
    await db.$transaction([
      db.productVariant.deleteMany({ where: { id: { in: plan.remove } } }),
      db.productVariant.updateMany({
        where: { id: { in: plan.deactivate } },
        data: { active: false },
      }),
      ...plan.update.map(({ id: variantId, ...variant }) =>
        db.productVariant.update({ where: { id: variantId }, data: variant }),
      ),
      ...plan.create.map((variant) =>
        db.productVariant.create({ data: { ...variant, productId: savedId } }),
      ),
    ]);

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return { error: 'SKU bị trùng với biến thể khác.' };
    console.error('Save product failed:', error);
    return { error: 'Không thể lưu sản phẩm. Vui lòng thử lại.' };
  }
  redirect(
    `/admin/${data.kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${savedId}/edit?saved=1`,
  );
}
