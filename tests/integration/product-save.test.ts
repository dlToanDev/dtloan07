/**
 * Test tích hợp form thêm / sửa sản phẩm Shop (saveProduct) và danh mục trên PostgreSQL thật.
 * Chạy bằng `pnpm test:int` sau khi đã dựng database.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

process.env.ACCOUNT_ENCRYPTION_KEY =
  process.env.ACCOUNT_ENCRYPTION_KEY || Buffer.alloc(32, 7).toString('base64');

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'x', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
// redirect() của Next ném lỗi để dừng action — giả lập để đọc được URL đích.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('REDIRECT'), { url });
  },
}));

const { db } = await import('@/lib/db');
const { decryptCredentials } = await import('@/lib/crypto/credentials');
const { saveProduct } = await import('@/server/actions/product');
const { createCategory, deleteCategory, updateCategory } =
  await import('@/server/actions/product-category');

const PREFIX = 'it-save-';
let apparelId = '';
let techId = '';

/** Gọi saveProduct; thành công thì trả về id sản phẩm lấy từ URL redirect. */
async function save(fields: Record<string, string>) {
  const form = new FormData();
  const base: Record<string, string> = {
    id: '',
    shortDesc: 'Mô tả ngắn',
    description: '<p>Chi tiết</p>',
    version: '1.0.0',
    saleMode: 'PAID',
    status: 'ACTIVE',
    priceVnd: '0',
    coverUrl: '',
    gallery: '[]',
    condition: '',
    conditionNote: '',
    warrantyNote: '',
    deliveryMode: '',
  };
  for (const [key, value] of Object.entries({ ...base, ...fields })) form.set(key, value);
  try {
    const result = await saveProduct({ error: '' }, form);
    return { error: result.error, id: '' };
  } catch (error) {
    const url = (error as { url?: string }).url;
    if (!url) throw error;
    return { error: '', id: url.split('/')[3]! };
  }
}

const variants = (rows: object[]) => JSON.stringify(rows);
const row = (name: string, priceVnd: number, stock: number | '' = '', id?: string) => ({
  ...(id && { id }),
  name,
  sku: '',
  priceVnd,
  compareAtVnd: '',
  stock,
  active: true,
});

async function cleanup() {
  const products = await db.product.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);
  await db.accountStock.deleteMany({ where: { variant: { productId: { in: ids } } } });
  await db.productVariant.deleteMany({ where: { productId: { in: ids } } });
  await db.product.deleteMany({ where: { id: { in: ids } } });
  await db.productCategory.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

beforeAll(async () => {
  await cleanup();
  apparelId = (
    await db.productCategory.create({ data: { name: 'IT Quần áo', slug: `${PREFIX}quan-ao` } })
  ).id;
  techId = (
    await db.productCategory.create({
      data: { name: 'IT Công nghệ', slug: `${PREFIX}cong-nghe`, hasCondition: true },
    })
  ).id;
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe('đồ vật lý nhiều màu / size', () => {
  it('lưu danh mục và từng dòng phân loại với số lượng riêng', async () => {
    const { error, id } = await save({
      name: 'Áo thun IT',
      slug: `${PREFIX}ao-thun`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      variants: variants([
        row('Đen / S', 150000, 10),
        row('Đen / M', 150000, 0),
        row('Trắng / L', 160000, ''),
      ]),
    });
    expect(error).toBe('');
    const product = await db.product.findUniqueOrThrow({
      where: { id },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(product.categoryId).toBe(apparelId);
    expect(product.priceVnd).toBe(150000);
    expect(product.variants.map((v) => [v.name, v.priceVnd, v.stock])).toEqual([
      ['Đen / S', 150000, 10],
      ['Đen / M', 150000, 0],
      ['Trắng / L', 160000, null],
    ]);
  });

  it('thiếu danh mục hoặc trùng màu + size → báo lỗi, không lưu', async () => {
    const noCategory = await save({
      name: 'Thiếu danh mục',
      slug: `${PREFIX}thieu-dm`,
      type: 'PHYSICAL',
      categoryId: '',
      variants: variants([row('Mặc định', 1000)]),
    });
    expect(noCategory.error).toBe('Vui lòng chọn danh mục.');

    const duplicate = await save({
      name: 'Trùng',
      slug: `${PREFIX}trung`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      variants: variants([row('Đen / M', 1000), row('đen / m', 1000)]),
    });
    expect(duplicate.error).toContain('trùng');
    expect(
      await db.product.count({ where: { slug: { in: [`${PREFIX}thieu-dm`, `${PREFIX}trung`] } } }),
    ).toBe(0);
  });

  it('tình trạng máy chỉ lưu khi danh mục có bật tình trạng', async () => {
    const tech = await save({
      name: 'Laptop IT',
      slug: `${PREFIX}laptop`,
      type: 'PHYSICAL',
      categoryId: techId,
      condition: 'USED',
      conditionNote: 'Pin 88%',
      variants: variants([row('Mặc định', 9000000, 1)]),
    });
    const apparel = await save({
      name: 'Mũ IT',
      slug: `${PREFIX}mu`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      condition: 'USED',
      conditionNote: 'không được lưu',
      variants: variants([row('Mặc định', 50000)]),
    });
    const [laptop, hat] = await Promise.all([
      db.product.findUniqueOrThrow({ where: { id: tech.id } }),
      db.product.findUniqueOrThrow({ where: { id: apparel.id } }),
    ]);
    expect([laptop.condition, laptop.conditionNote]).toEqual(['USED', 'Pin 88%']);
    expect([hat.condition, hat.conditionNote]).toEqual([null, null]);
  });
});

describe('tài khoản số: nhập thông tin tài khoản ngay trên form', () => {
  it('tạo mới → mã hóa từng dòng vào kho của biến thể duy nhất', async () => {
    const { error, id } = await save({
      name: 'Netflix IT',
      slug: `${PREFIX}netflix`,
      type: 'ACCOUNT',
      categoryId: apparelId,
      deliveryMode: 'AUTO',
      variants: variants([row('Mặc định', 99000, '')]),
      accountLines: 'a@x.com|pass1\n\n  b@x.com|pass2  \nc@x.com|pass3|ghi chú\n',
    });
    expect(error).toBe('');
    const stock = await db.accountStock.findMany({
      where: { variant: { productId: id } },
      orderBy: { createdAt: 'asc' },
    });
    expect(stock).toHaveLength(3);
    expect(stock.every((s) => s.status === 'AVAILABLE')).toBe(true);
    expect(stock.map((s) => decryptCredentials(s.credentials)).sort()).toEqual([
      'a@x.com|pass1',
      'b@x.com|pass2',
      'c@x.com|pass3|ghi chú',
    ]);
    expect(stock[0]!.credentials).not.toContain('pass1');
  });

  it('sửa lại → giữ id biến thể và cộng thêm tài khoản vào kho cũ', async () => {
    const product = await db.product.findUniqueOrThrow({
      where: { slug: `${PREFIX}netflix` },
      include: { variants: true },
    });
    const variantId = product.variants[0]!.id;
    const { error } = await save({
      id: product.id,
      name: 'Netflix IT',
      slug: `${PREFIX}netflix`,
      type: 'ACCOUNT',
      categoryId: apparelId,
      deliveryMode: 'AUTO',
      variants: variants([row('Mặc định', 89000, '', variantId)]),
      accountLines: 'd@x.com|pass4\ne@x.com|pass5',
    });
    expect(error).toBe('');
    const after = await db.productVariant.findMany({
      where: { productId: product.id },
      include: { _count: { select: { accountStock: true } } },
    });
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(variantId);
    expect(after[0]!.priceVnd).toBe(89000);
    expect(after[0]!._count.accountStock).toBe(5);
  });

  it('tự gửi (MANUAL) → bỏ qua ô tài khoản, lưu số lượng', async () => {
    const { error, id } = await save({
      name: 'Canva IT',
      slug: `${PREFIX}canva`,
      type: 'ACCOUNT',
      categoryId: apparelId,
      deliveryMode: 'MANUAL',
      variants: variants([row('Mặc định', 50000, 0)]),
      accountLines: 'khong-duoc-luu@x.com|p',
    });
    expect(error).toBe('');
    const variant = await db.productVariant.findFirstOrThrow({ where: { productId: id } });
    expect(variant.stock).toBe(0);
    expect(await db.accountStock.count({ where: { variantId: variant.id } })).toBe(0);
  });
});

describe('bỏ rồi thêm lại phân loại', () => {
  it('phân loại còn tài khoản trong kho chỉ bị ẩn; thêm lại cùng tên thì dùng lại biến thể cũ', async () => {
    const created = await save({
      name: 'Gói IT',
      slug: `${PREFIX}goi`,
      type: 'ACCOUNT',
      categoryId: apparelId,
      deliveryMode: 'AUTO',
      variants: variants([row('1 tháng', 50000), row('3 tháng', 120000)]),
    });
    expect(created.error).toBe('');
    const [oneMonth, threeMonths] = await db.productVariant.findMany({
      where: { productId: created.id },
      orderBy: { sortOrder: 'asc' },
    });
    await db.accountStock.create({
      data: { variantId: threeMonths!.id, credentials: 'x' },
    });

    // Bỏ gói "3 tháng" (đang có tài khoản trong kho) → không lỗi, chỉ ẩn.
    const removed = await save({
      id: created.id,
      name: 'Gói IT',
      slug: `${PREFIX}goi`,
      type: 'ACCOUNT',
      categoryId: apparelId,
      deliveryMode: 'AUTO',
      variants: variants([row('1 tháng', 50000, '', oneMonth!.id)]),
    });
    expect(removed.error).toBe('');
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: threeMonths!.id } })).active,
    ).toBe(false);

    // Thêm lại "3 tháng" như dòng mới → mở lại đúng biến thể cũ, không tạo bản trùng tên.
    const readded = await save({
      id: created.id,
      name: 'Gói IT',
      slug: `${PREFIX}goi`,
      type: 'ACCOUNT',
      categoryId: apparelId,
      deliveryMode: 'AUTO',
      variants: variants([row('1 tháng', 50000, '', oneMonth!.id), row('3 tháng', 110000)]),
    });
    expect(readded.error).toBe('');
    const after = await db.productVariant.findMany({ where: { productId: created.id } });
    expect(after).toHaveLength(2);
    const back = after.find((variant) => variant.name === '3 tháng')!;
    expect([back.id, back.active, back.priceVnd]).toEqual([threeMonths!.id, true, 110000]);
  });
});

describe('lưu nguyên khối', () => {
  it('lỗi ở bước lưu phân loại (trùng SKU) → không đổi gì ở sản phẩm', async () => {
    const other = await save({
      name: 'Có SKU',
      slug: `${PREFIX}co-sku`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      variants: variants([{ ...row('Mặc định', 1000), sku: 'IT-SKU-1' }]),
    });
    const target = await save({
      name: 'Tên gốc',
      slug: `${PREFIX}ten-goc`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      variants: variants([row('Mặc định', 1000)]),
    });
    expect([other.error, target.error]).toEqual(['', '']);

    const failed = await save({
      id: target.id,
      name: 'Tên mới',
      slug: `${PREFIX}ten-goc`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      variants: variants([{ ...row('Đen', 2000), sku: 'IT-SKU-1' }]),
    });
    expect(failed.error).toBe('SKU bị trùng với biến thể khác.');
    const product = await db.product.findUniqueOrThrow({
      where: { id: target.id },
      include: { variants: true },
    });
    expect(product.name).toBe('Tên gốc');
    expect(product.variants.map((v) => v.name)).toEqual(['Mặc định']);
  });
});

describe('thông báo lỗi', () => {
  it('tên chỉ có khoảng trắng → báo lỗi tiếng Việt', async () => {
    const { error } = await save({
      name: '   ',
      slug: `${PREFIX}ten-trong`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      variants: variants([row('Mặc định', 1000)]),
    });
    expect(error).toBe('Vui lòng nhập tên sản phẩm.');
  });
});

describe('mô tả chi tiết', () => {
  it('để trống mô tả chi tiết vẫn lưu được', async () => {
    const { error } = await save({
      name: 'Không mô tả',
      slug: `${PREFIX}khong-mo-ta`,
      type: 'PHYSICAL',
      categoryId: apparelId,
      description: '',
      variants: variants([row('Mặc định', 1000)]),
    });
    expect(error).toBe('');
  });
});

describe('danh mục', () => {
  it('slug tự sinh không trùng, không cho trùng tên, không xóa khi còn sản phẩm', async () => {
    const a = await createCategory({ name: 'It Save Giày dép' });
    const dup = await createCategory({ name: 'it save giày DÉP' });
    expect(a.ok && a.data.slug).toBe('it-save-giay-dep');
    expect(dup).toEqual({ ok: false, error: 'Đã có danh mục "It Save Giày dép".' });

    // Đổi tên sang tên khác → slug đổi theo; bật tình trạng máy.
    if (!a.ok) throw new Error('create failed');
    expect(
      (await updateCategory({ id: a.data.id, name: 'It Save Dép', hasCondition: true })).ok,
    ).toBe(true);
    const renamed = await db.productCategory.findUniqueOrThrow({ where: { id: a.data.id } });
    expect([renamed.slug, renamed.hasCondition]).toEqual(['it-save-dep', true]);

    const blocked = await deleteCategory(apparelId);
    expect(blocked.ok).toBe(false);
    expect((await deleteCategory(a.data.id)).ok).toBe(true);
  });
});
