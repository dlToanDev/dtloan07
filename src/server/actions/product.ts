'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isR2Configured, uploadToStorage } from '@/lib/storage';
import {
  encryptCredentials,
  isCredentialKeyConfigured,
  splitCredentialLines,
} from '@/lib/crypto/credentials';
import { parseVariantsInput, planVariantSync, type VariantInput } from '@/lib/shop/variant-input';
import { slugifyPostTitle } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { siteConfig } from '@/config/site';

/** Số tài khoản tối đa nhập vào kho trong một lần lưu (giống nhập kho hàng loạt). */
const MAX_ACCOUNT_LINES = 500;

export async function requireProductAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') throw new Error('Bạn không có quyền quản lý sản phẩm.');
}

const optionalEnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const schema = z.object({
  name: z
    .string({ required_error: 'Vui lòng nhập tên sản phẩm.' })
    .trim()
    .min(1, 'Vui lòng nhập tên sản phẩm.')
    .max(200, 'Tên sản phẩm tối đa 200 ký tự.'),
  slug: z
    .string({ required_error: 'Vui lòng nhập đường dẫn (slug) sản phẩm.' })
    .trim()
    .min(1, 'Vui lòng nhập đường dẫn (slug) sản phẩm.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  shortDesc: z
    .string({ required_error: 'Vui lòng nhập mô tả ngắn.' })
    .trim()
    .min(1, 'Vui lòng nhập mô tả ngắn.')
    .max(500, 'Mô tả ngắn tối đa 500 ký tự.'),
  // Mô tả chi tiết không bắt buộc — trang sản phẩm ẩn khung mô tả khi trống.
  description: z.string().trim().default(''),
  version: z.preprocess(
    (value) => (!value ? '1.0.0' : value),
    z
      .string({ required_error: 'Vui lòng nhập phiên bản.' })
      .trim()
      .min(1, 'Vui lòng nhập phiên bản.')
      .max(50),
  ),
  saleMode: z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? 'PAID' : value),
    z.enum(['FREE', 'CONTACT', 'PAID'], { required_error: 'Vui lòng chọn hình thức bán.' }),
  ),
  status: z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? 'ACTIVE' : value),
    z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'], { required_error: 'Trạng thái không hợp lệ.' }),
  ),
  priceVnd: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : val),
    z.coerce
      .number({ invalid_type_error: 'Giá không hợp lệ.' })
      .int()
      .min(0, 'Giá không hợp lệ.')
      .max(2147483647, 'Giá quá lớn (tối đa khoảng 2,1 tỷ đ).'),
  ),
  coverUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !value || value.startsWith('/') || /^https?:\/\//.test(value), {
      message: 'Ảnh bìa không hợp lệ.',
    })
    .default(''),

  // --- Shop ---
  type: z.preprocess(
    (value) => (!value ? 'ACCOUNT' : value),
    z.enum(['DOWNLOAD', 'PHYSICAL', 'ACCOUNT'], {
      required_error: 'Vui lòng chọn loại sản phẩm.',
    }),
  ),
  categoryId: z.string().trim().max(50).optional().default(''),
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
  const rawData: Record<string, unknown> = Object.fromEntries(form);

  // Fallbacks thông minh và tự động tạo slug nếu thiếu
  if (!rawData.slug && typeof rawData.name === 'string' && rawData.name.trim()) {
    rawData.slug = slugifyPostTitle(rawData.name);
  }
  if (!rawData.status) {
    rawData.status = 'ACTIVE';
  }
  if (!rawData.version) {
    rawData.version = '1.0.0';
  }
  if (!rawData.type) {
    rawData.type = 'ACCOUNT';
  }
  if (!rawData.saleMode) {
    rawData.saleMode = rawData.type === 'DOWNLOAD' ? 'FREE' : 'PAID';
  }
  if (!rawData.priceVnd) {
    rawData.priceVnd = '0';
  }
  if (!rawData.coverUrl) {
    rawData.coverUrl = '';
  }
  if (!rawData.description) {
    rawData.description = '';
  }

  const parsed = schema.safeParse(rawData);
  if (!parsed.success)
    return { error: parsed.error.errors[0]?.message || 'Thông tin không hợp lệ.' };
  const data = parsed.data;

  // Hàng cần giao (đồ vật lý / tài khoản số) dùng biến thể để quyết định giá,
  // còn source code (tải file) giữ luồng saleMode + priceVnd.
  const isShopGoods = data.type !== 'DOWNLOAD';
  const category = data.categoryId
    ? await db.productCategory.findUnique({ where: { id: data.categoryId } })
    : null;
  if (!category) return { error: 'Vui lòng chọn danh mục.' };
  const hasCondition = Boolean(category?.hasCondition);
  if (data.type === 'ACCOUNT' && !data.deliveryMode)
    return { error: 'Vui lòng chọn cách bàn giao tài khoản.' };

  // Thông tin tài khoản nhập ngay trên form (mỗi dòng một tài khoản) → thêm vào kho khi lưu.
  const accountLines =
    data.type === 'ACCOUNT' && data.deliveryMode === 'AUTO'
      ? splitCredentialLines(String(form.get('accountLines') || ''))
      : [];
  if (accountLines.length > MAX_ACCOUNT_LINES)
    return { error: `Mỗi lần lưu tối đa ${MAX_ACCOUNT_LINES} tài khoản.` };
  if (accountLines.length && !isCredentialKeyConfigured())
    return { error: 'Chưa cấu hình ACCOUNT_ENCRYPTION_KEY nên chưa lưu được thông tin tài khoản.' };

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
    categoryId: category?.id ?? null,
    condition: hasCondition ? (data.condition ?? null) : null,
    conditionNote: hasCondition ? data.conditionNote || null : null,
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
    categoryId: _categoryId,
    condition: _condition,
    conditionNote: _conditionNote,
    warrantyNote: _warrantyNote,
    deliveryMode: _deliveryMode,
    ...baseData
  } = data;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const showOnTelegram = form.has('showOnTelegram')
    ? form.get('showOnTelegram') === 'on' || form.get('showOnTelegram') === 'true'
    : false;
  const isFeatured = form.has('isFeatured')
    ? form.get('isFeatured') === 'on' || form.get('isFeatured') === 'true'
    : false;

  const productData = {
    ...baseData,
    ...shopFields,
    showOnTelegram,
    isFeatured,
  };

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
    // Đọc và tính toán hết trước, rồi ghi trong MỘT transaction dạng batch: không giữ transaction
    // mở qua nhiều lượt đi-về mạng (database cloud có độ trễ), lỗi ở bước nào cũng không lưu dở.
    const productId = existing ? id : randomUUID();

    // Đồng bộ biến thể: tạo mới, cập nhật, ẩn (đã có đơn / còn kho) hoặc xóa (chưa bán).
    const existingVariants = existing
      ? await db.productVariant.findMany({
          where: { productId },
          select: {
            id: true,
            name: true,
            _count: { select: { orderItems: true, accountStock: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        })
      : [];
    // Sản phẩm file tải về: giữ id của biến thể "Mặc định" hiện có để không đứt đơn cũ.
    if (!isShopGoods && existingVariants[0] && variantInputs[0])
      variantInputs[0] = { ...variantInputs[0], id: existingVariants[0].id };
    // Dòng mới trùng tên một biến thể cũ đã bị bỏ (vd. xóa "Đen / M" rồi thêm lại) → dùng lại
    // biến thể cũ, tránh hai biến thể cùng tên làm các lần lưu sau bị từ chối.
    const referenced = new Set(variantInputs.map((variant) => variant.id).filter(Boolean));
    variantInputs = variantInputs.map((variant) => {
      if (variant.id) return variant;
      const match = existingVariants.find(
        (old) => !referenced.has(old.id) && old.name.toLowerCase() === variant.name.toLowerCase(),
      );
      if (!match) return variant;
      referenced.add(match.id);
      return { ...variant, id: match.id };
    });
    const plan = planVariantSync(
      existingVariants.map((variant) => ({
        id: variant.id,
        // Biến thể đã có đơn hoặc còn tài khoản trong kho (FK Restrict) chỉ được ẩn, không xóa.
        hasOrders: variant._count.orderItems > 0 || variant._count.accountStock > 0,
      })),
      variantInputs,
    );
    // Cấp id trước cho biến thể mới để biết ngay biến thể nhận tài khoản.
    const creates = plan.create.map((variant) => ({ ...variant, id: randomUUID(), productId }));

    // Tài khoản nhập trên form vào biến thể đang bán đầu tiên (theo thứ tự trên form).
    const firstActive = [...plan.update, ...creates]
      .filter((variant) => variant.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (accountLines.length && !firstActive)
      return { error: 'Cần ít nhất một phân loại đang bán để nhập tài khoản.' };
    const encryptedAccounts = accountLines.map((line) => encryptCredentials(line));

    await db.$transaction([
      existing
        ? db.product.update({ where: { id }, data: { ...productData, files } })
        : db.product.create({ data: { ...productData, id: productId, files } }),
      db.productVariant.deleteMany({ where: { id: { in: plan.remove } } }),
      db.productVariant.updateMany({
        where: { id: { in: plan.deactivate } },
        data: { active: false },
      }),
      ...plan.update.map(({ id: variantId, ...variant }) =>
        db.productVariant.update({ where: { id: variantId }, data: variant }),
      ),
      db.productVariant.createMany({ data: creates }),
      db.accountStock.createMany({
        data: encryptedAccounts.map((credentials) => ({
          variantId: firstActive!.id,
          credentials,
        })),
      }),
    ]);
    savedId = productId;

    for (const path of [
      '/',
      '/admin/shop',
      '/admin/products',
      siteConfig.shopPath,
      `${siteConfig.shopPath}/${data.slug}`,
    ])
      revalidatePath(path);
    if (existing) {
      revalidatePath(`${siteConfig.shopPath}/${existing.slug}`);
    }
    revalidatePath(`/admin/shop/${savedId}/edit`);
    revalidatePath(`/admin/products/${savedId}/edit`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return { error: 'SKU bị trùng với biến thể khác.' };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')
      return {
        error:
          'Không xóa được phân loại đang có đơn hàng hoặc tài khoản trong kho. Hãy tải lại trang.',
      };
    console.error('Save product failed:', error);
    return { error: 'Không thể lưu sản phẩm. Vui lòng thử lại.' };
  }
  redirect(`/admin/shop/${savedId}/edit?saved=1`);
}

export async function toggleProductTelegram(productId: string) {
  await requireProductAdmin();
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, showOnTelegram: true },
  });
  if (!product) throw new Error('Không tìm thấy sản phẩm.');

  await db.product.update({
    where: { id: productId },
    data: { showOnTelegram: !product.showOnTelegram },
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/shop');
}
