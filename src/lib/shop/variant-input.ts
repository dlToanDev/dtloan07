import { z } from 'zod';

const MAX_INT = 2147483647;
const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const variantSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1, 'Tên biến thể không được để trống.').max(100),
    sku: z.preprocess(emptyToNull, z.string().trim().max(64).nullable()),
    priceVnd: z.coerce
      .number()
      .int()
      .min(0, 'Giá biến thể không được âm.')
      .max(MAX_INT, 'Giá quá lớn (tối đa khoảng 2,1 tỷ đ).'),
    compareAtVnd: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(MAX_INT).nullable()),
    stock: z.preprocess(
      emptyToNull,
      z.coerce.number().int().min(0, 'Tồn kho không được âm.').max(MAX_INT).nullable(),
    ),
    active: z.boolean().default(true),
  })
  .refine((variant) => variant.compareAtVnd === null || variant.compareAtVnd > variant.priceVnd, {
    message: 'Giá gạch ngang phải lớn hơn giá bán.',
  });

export type VariantInput = z.infer<typeof variantSchema>;

/** Đọc JSON biến thể từ field ẩn của form admin. Không bao giờ throw. */
export function parseVariantsInput(
  raw: unknown,
): { ok: true; variants: VariantInput[] } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, error: 'Dữ liệu biến thể không hợp lệ.' };
  }
  const parsed = z.array(variantSchema).min(1, 'Cần ít nhất 1 biến thể.').safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? 'Dữ liệu biến thể không hợp lệ.',
    };
  }
  const seen = new Set<string>();
  for (const variant of parsed.data) {
    const key = variant.name.toLowerCase();
    if (seen.has(key)) return { ok: false, error: `Tên biến thể bị trùng: "${variant.name}".` };
    seen.add(key);
  }
  return {
    ok: true,
    variants: parsed.data.map(({ id, ...rest }) => (id ? { id, ...rest } : rest)),
  };
}

/**
 * So khớp biến thể trong form với biến thể đang có trong DB.
 * Biến thể bị bỏ khỏi form mà đã có đơn hàng chỉ được ẩn đi (FK Restrict),
 * biến thể chưa từng bán thì xóa hẳn.
 */
export function planVariantSync(
  existing: { id: string; hasOrders: boolean }[],
  incoming: VariantInput[],
) {
  const existingIds = new Set(existing.map((variant) => variant.id));
  const create: (VariantInput & { sortOrder: number })[] = [];
  const update: (VariantInput & { id: string; sortOrder: number })[] = [];
  incoming.forEach((variant, sortOrder) => {
    if (variant.id && existingIds.has(variant.id)) {
      update.push({ ...variant, id: variant.id, sortOrder });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignored, ...rest } = variant;
      create.push({ ...rest, sortOrder });
    }
  });
  const kept = new Set(update.map((variant) => variant.id));
  const dropped = existing.filter((variant) => !kept.has(variant.id));
  return {
    create,
    update,
    deactivate: dropped.filter((variant) => variant.hasOrders).map((variant) => variant.id),
    remove: dropped.filter((variant) => !variant.hasOrders).map((variant) => variant.id),
  };
}
