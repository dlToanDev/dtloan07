# Shop Giai đoạn 1: Dữ liệu + Catalog + Biến thể — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shop có loại hàng (tải file / đồ vật lý / tài khoản), danh mục, tình trạng máy, bảo hành, gallery và biến thể có giá + tồn kho riêng; admin quản lý được; khách lọc, xem và chọn biến thể. Checkout vẫn chỉ bán hàng `DOWNLOAD` (hàng vật lý/tài khoản hiện "Sắp mở bán").

**Architecture:** Mở rộng model `Product` bằng cột mới + bảng `ProductVariant`. Mọi logic nghiệp vụ (chọn biến thể mặc định, gộp dòng giỏ, tổng hợp giá "từ X đ", sinh tổ hợp biến thể, kế hoạch đồng bộ biến thể, lọc shop) nằm trong các module thuần `src/lib/shop/*` có unit test; route/API/component chỉ gọi vào đó. Giỏ hàng nhận diện dòng bằng `productId + variantId`.

**Tech Stack:** Next.js 15 (App Router, Server Actions), React 19, Prisma 6 + PostgreSQL, Zod 3, Zustand 5 (persist), Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-25-shop-redesign-design.md` (mục 3.1–3.3, 3.7 một phần, 5.1–5.3, 6.1, 8, 10 giai đoạn 1)

## Global Constraints

- Chỉ đụng Shop (`Product.kind = SHOP`). Form/trang Source Code phải hoạt động y như cũ.
- Tiền là số nguyên VND (`Int`), không dùng Float.
- Server luôn tự tính giá từ DB; client chỉ gửi `{ productId, variantId?, qty }`.
- Mọi sản phẩm luôn có ≥ 1 `ProductVariant`. Biến thể mặc định = biến thể `active` có `sortOrder` nhỏ nhất (hòa thì `id` nhỏ hơn).
- `stock = null` nghĩa là không giới hạn.
- Giai đoạn 1: `PURCHASABLE_TYPES = ['DOWNLOAD']`. Hàng `PHYSICAL`/`ACCOUNT` không vào được giỏ/checkout; UI hiện "Sắp mở bán".
- Tên biến thể tổ hợp nối bằng `" / "` (ví dụ `"Đen / M"`).
- Chuỗi hiển thị bằng tiếng Việt có dấu.
- Không thêm dependency mới.
- Chạy trước mỗi commit: `pnpm typecheck && pnpm lint && pnpm test`.
- Migration đang chờ `20260925090000_product_sale_modes` phải được apply trước (`pnpm prisma migrate dev`) — Task 1 bước 1.

## Review Focus

1. Giỏ hàng cũ trong localStorage (item không có `variantId`) → phải tự dùng biến thể mặc định, không mất giỏ, không lỗi. (Test: Task 3 `migrateCartState`, Task 2 `resolveCartLines` legacy line.)
2. Cùng một biến thể xuất hiện 2 lần trong giỏ (1 dòng legacy + 1 dòng có `variantId` mặc định) → gộp thành 1 dòng, cộng số lượng. (Test: Task 2.)
3. Admin xóa biến thể đã có đơn hàng → không được xóa cứng (FK `Restrict`), phải chuyển `active=false`. (Test: Task 5 `planVariantSync`.)
4. Sản phẩm mọi biến thể đều inactive hoặc hết hàng → thẻ hiện "Hết hàng", không có biến thể mặc định, API giỏ trả lỗi rõ ràng thay vì crash. (Test: Task 2 `summarizeVariants`, `resolveCartLines`.)
5. Query `/shop?c=abc` hoặc `?cond=` rác → bỏ qua filter, không 500. (Test: Task 7 `parseShopFilters`.)

---

## File Structure

| File                                                                                                                               | Trách nhiệm                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                                                                             | Enum + cột + model mới                                                                                                                        |
| `prisma/migrations/20260926090000_shop_variants/migration.sql`                                                                     | DDL + backfill                                                                                                                                |
| `src/lib/shop/variants.ts` (mới)                                                                                                   | Kiểu dữ liệu biến thể, `lineKey`, `pickDefaultVariant`, `resolveCartLines`, `summarizeVariants`, `generateVariantCombos`, `PURCHASABLE_TYPES` |
| `src/lib/shop/variant-input.ts` (mới)                                                                                              | Zod schema input biến thể từ form, `parseVariantsInput`, `planVariantSync`                                                                    |
| `src/lib/shop/cart-items.ts` (mới)                                                                                                 | Thao tác thuần trên mảng dòng giỏ + `migrateCartState`                                                                                        |
| `src/lib/shop/filters.ts` (mới)                                                                                                    | Danh mục/tình trạng (nhãn, slug), `parseShopFilters`, `buildShopWhere`                                                                        |
| `src/lib/pricing.ts`                                                                                                               | Hỗ trợ `variantId` (map theo `lineKey`)                                                                                                       |
| `src/hooks/use-cart.ts`                                                                                                            | Dùng `cart-items.ts`, persist `version: 1`                                                                                                    |
| `src/app/api/cart/validate/route.ts`, `src/app/api/checkout/route.ts`                                                              | Resolve biến thể, snapshot vào `OrderItem`                                                                                                    |
| `src/components/shop/cart-drawer.tsx`, `src/app/(shop)/checkout/page.tsx`                                                          | Key theo dòng, hiện tên biến thể                                                                                                              |
| `src/server/actions/product.ts`                                                                                                    | Lưu trường Shop + đồng bộ biến thể                                                                                                            |
| `src/components/admin/shop/*.tsx` (mới)                                                                                            | `ShopDetailsSection`, `GalleryPicker`, `VariantTable`                                                                                         |
| `src/components/admin/product-form.tsx`, `product-editor-page.tsx`                                                                 | Gắn các section Shop                                                                                                                          |
| `src/components/shop/product-card.tsx`, `src/app/shop/page.tsx`                                                                    | Giá "từ", badge, tab lọc                                                                                                                      |
| `src/components/shop/variant-purchase-panel.tsx`, `product-gallery.tsx` (mới), `product-detail-page.tsx`, `add-to-cart-button.tsx` | Trang chi tiết chọn biến thể                                                                                                                  |

---

### Task 1: Schema + migration + backfill

**Files:**

- Modify: `prisma/schema.prisma` (model `Product` dòng ~99-122, `OrderItem` ~182-192)
- Create: `prisma/migrations/20260926090000_shop_variants/migration.sql`

**Interfaces:**

- Produces: Prisma types `ProductType`, `ShopCategory`, `ItemCondition`, `DeliveryMode`, `ProductVariant`; `Product.variants`, `Product.type|category|condition|conditionNote|warrantyNote|deliveryMode|gallery`; `OrderItem.variantId|variantNameSnapshot|productTypeSnapshot`.

- [ ] **Step 1: Apply migration đang chờ**

Run: `pnpm prisma migrate dev` (không đổi schema) — Expected: `20260925090000_product_sale_modes` applied, "Already in sync".

- [ ] **Step 2: Thêm enum vào `prisma/schema.prisma` ngay sau `enum ProductSaleMode { ... }`**

```prisma
enum ProductType {
  DOWNLOAD
  PHYSICAL
  ACCOUNT
}

enum ShopCategory {
  APPAREL
  HAT
  MUG
  ACCESSORY
  TECH
  ACCOUNT
  OTHER
}

enum ItemCondition {
  NEW
  LIKE_NEW
  USED
}

enum DeliveryMode {
  AUTO
  MANUAL
}
```

- [ ] **Step 3: Thêm cột vào `model Product`** (sau dòng `maxDownloads`), và quan hệ `variants`:

```prisma
  type          ProductType   @default(DOWNLOAD)
  category      ShopCategory?
  condition     ItemCondition?
  conditionNote String?
  warrantyNote  String?
  deliveryMode  DeliveryMode?
  gallery       String[]      @default([])
```

Trong khối quan hệ của `Product` thêm: `variants   ProductVariant[]`. Thêm index: `@@index([kind, status, category])`.

- [ ] **Step 4: Thêm model `ProductVariant`** ngay sau `model Product`:

```prisma
model ProductVariant {
  id           String  @id @default(cuid())
  productId    String
  name         String
  sku          String? @unique
  priceVnd     Int
  compareAtVnd Int?
  stock        Int?
  sortOrder    Int     @default(0)
  active       Boolean @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]

  @@index([productId, active])
}
```

- [ ] **Step 5: Thêm cột vào `model OrderItem`**

```prisma
  variantId           String?
  variantNameSnapshot String?
  productTypeSnapshot ProductType @default(DOWNLOAD)

  variant ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Restrict)
```

- [ ] **Step 6: Sinh migration nhưng chưa apply**

Run: `pnpm prisma migrate dev --create-only --name shop_variants`
Sau đó đổi tên thư mục vừa sinh thành `prisma/migrations/20260926090000_shop_variants` (giữ thứ tự sau `20260925090000`).

- [ ] **Step 7: Nối SQL backfill vào cuối `migration.sql`**

```sql
-- Backfill: mỗi sản phẩm hiện có nhận 1 biến thể "Mặc định" theo giá hiện tại.
INSERT INTO "ProductVariant" ("id", "productId", "name", "priceVnd", "compareAtVnd", "stock", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'var_' || p."id", p."id", 'Mặc định', p."priceVnd", p."compareAtVnd", NULL, 0, true, NOW(), NOW()
FROM "Product" p;

-- Đơn cũ trỏ về biến thể mặc định của sản phẩm.
UPDATE "OrderItem" oi SET "variantId" = 'var_' || oi."productId"
WHERE oi."variantId" IS NULL;

-- Sản phẩm Shop cũ là file tải về.
UPDATE "Product" SET "category" = 'OTHER' WHERE "kind" = 'SHOP' AND "category" IS NULL;
```

- [ ] **Step 8: Apply và kiểm tra**

Run: `pnpm prisma migrate dev` rồi `pnpm prisma generate`
Run: `psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "Product"; SELECT COUNT(*) FROM "ProductVariant";'`
Expected: hai con số bằng nhau.

- [ ] **Step 9: Typecheck + test baseline**

Run: `pnpm typecheck && pnpm test` — Expected: PASS (55 tests), không lỗi type.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260926090000_shop_variants
git commit -m "feat(shop): thêm loại hàng, danh mục, tình trạng và bảng biến thể"
```

---

### Task 2: Module thuần biến thể (`src/lib/shop/variants.ts`)

**Files:**

- Create: `src/lib/shop/variants.ts`
- Test: `tests/unit/shop-variants.test.ts`

**Interfaces:**

- Produces:
  - `type ProductTypeValue = 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT'`
  - `interface VariantSnapshot { id: string; name: string; priceVnd: number; compareAtVnd: number | null; stock: number | null; sortOrder: number; active: boolean }`
  - `interface ProductForCart { id: string; name: string; slug: string; coverUrl: string; type: ProductTypeValue; status: string; saleMode: string; variants: VariantSnapshot[] }`
  - `interface CartLineInput { productId: string; variantId?: string | null; qty: number }`
  - `interface ResolvedCartLine { productId: string; variantId: string; qty: number; product: ProductForCart; variant: VariantSnapshot }`
  - `interface CartLineError { productId: string; variantId?: string | null; message: string }`
  - `const PURCHASABLE_TYPES: readonly ProductTypeValue[]`
  - `lineKey(productId: string, variantId?: string | null): string`
  - `pickDefaultVariant(variants: VariantSnapshot[]): VariantSnapshot | null`
  - `resolveCartLines(items: CartLineInput[], products: ProductForCart[], purchasable?: readonly ProductTypeValue[]): { lines: ResolvedCartLine[]; errors: CartLineError[] }`
  - `summarizeVariants(variants: VariantSnapshot[]): VariantSummary` với `interface VariantSummary { minPriceVnd: number; maxPriceVnd: number; compareAtVnd: number | null; hasMultiple: boolean; soldOut: boolean }`
  - `generateVariantCombos(groups: string[]): string[]`

- [ ] **Step 1: Viết test fail**

```ts
// tests/unit/shop-variants.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateVariantCombos,
  lineKey,
  pickDefaultVariant,
  resolveCartLines,
  summarizeVariants,
  type ProductForCart,
  type VariantSnapshot,
} from '@/lib/shop/variants';

const v = (over: Partial<VariantSnapshot> & { id: string }): VariantSnapshot => ({
  name: over.id,
  priceVnd: 100000,
  compareAtVnd: null,
  stock: null,
  sortOrder: 0,
  active: true,
  ...over,
});

const product = (over: Partial<ProductForCart> & { id: string }): ProductForCart => ({
  name: 'SP',
  slug: over.id,
  coverUrl: '',
  type: 'DOWNLOAD',
  status: 'ACTIVE',
  saleMode: 'PAID',
  variants: [v({ id: `${over.id}-v1` })],
  ...over,
});

describe('lineKey', () => {
  it('ghép productId và variantId, bỏ variantId rỗng', () => {
    expect(lineKey('p1', 'v1')).toBe('p1:v1');
    expect(lineKey('p1')).toBe('p1');
    expect(lineKey('p1', null)).toBe('p1');
  });
});

describe('pickDefaultVariant', () => {
  it('chọn biến thể active có sortOrder nhỏ nhất, hòa thì id nhỏ hơn', () => {
    const picked = pickDefaultVariant([
      v({ id: 'b', sortOrder: 1 }),
      v({ id: 'c', sortOrder: 0 }),
      v({ id: 'a', sortOrder: 0 }),
      v({ id: 'z', sortOrder: -1, active: false }),
    ]);
    expect(picked?.id).toBe('a');
  });
  it('trả null khi không còn biến thể active', () => {
    expect(pickDefaultVariant([v({ id: 'x', active: false })])).toBeNull();
  });
});

describe('resolveCartLines', () => {
  const p1 = product({
    id: 'p1',
    variants: [v({ id: 'p1-a', sortOrder: 0 }), v({ id: 'p1-b', sortOrder: 1, stock: 2 })],
  });

  it('dòng legacy không có variantId dùng biến thể mặc định', () => {
    const { lines, errors } = resolveCartLines([{ productId: 'p1', qty: 1 }], [p1]);
    expect(errors).toEqual([]);
    expect(lines[0]?.variantId).toBe('p1-a');
  });

  it('gộp dòng legacy và dòng có variantId mặc định thành 1 dòng', () => {
    const { lines } = resolveCartLines(
      [
        { productId: 'p1', qty: 1 },
        { productId: 'p1', variantId: 'p1-a', qty: 2 },
      ],
      [p1],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(3);
  });

  it('báo lỗi khi vượt tồn kho', () => {
    const { lines, errors } = resolveCartLines(
      [{ productId: 'p1', variantId: 'p1-b', qty: 3 }],
      [p1],
    );
    expect(lines).toHaveLength(0);
    expect(errors[0]?.message).toContain('chỉ còn 2');
  });

  it('báo lỗi khi sản phẩm hoặc biến thể không tồn tại / inactive', () => {
    const { errors } = resolveCartLines(
      [
        { productId: 'nope', qty: 1 },
        { productId: 'p1', variantId: 'ghost', qty: 1 },
      ],
      [p1],
    );
    expect(errors).toHaveLength(2);
  });

  it('báo lỗi khi mọi biến thể đều inactive', () => {
    const dead = product({ id: 'p2', variants: [v({ id: 'p2-a', active: false })] });
    const { lines, errors } = resolveCartLines([{ productId: 'p2', qty: 1 }], [dead]);
    expect(lines).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('từ chối loại hàng chưa mở bán (PHYSICAL ở giai đoạn 1)', () => {
    const shirt = product({ id: 'p3', type: 'PHYSICAL' });
    const { lines, errors } = resolveCartLines([{ productId: 'p3', qty: 1 }], [shirt]);
    expect(lines).toHaveLength(0);
    expect(errors[0]?.message).toContain('Sắp mở bán');
  });

  it('chuẩn hóa qty về số nguyên >= 1', () => {
    const { lines } = resolveCartLines([{ productId: 'p1', qty: 0 }], [p1]);
    expect(lines[0]?.qty).toBe(1);
  });
});

describe('summarizeVariants', () => {
  it('tính giá thấp/cao nhất và giá gạch của biến thể rẻ nhất', () => {
    const s = summarizeVariants([
      v({ id: 'a', priceVnd: 150000 }),
      v({ id: 'b', priceVnd: 90000, compareAtVnd: 120000 }),
      v({ id: 'c', priceVnd: 10, active: false }),
    ]);
    expect(s).toEqual({
      minPriceVnd: 90000,
      maxPriceVnd: 150000,
      compareAtVnd: 120000,
      hasMultiple: true,
      soldOut: false,
    });
  });
  it('soldOut khi mọi biến thể active có stock = 0 hoặc không có biến thể active', () => {
    expect(summarizeVariants([v({ id: 'a', stock: 0 })]).soldOut).toBe(true);
    expect(summarizeVariants([v({ id: 'a', active: false })]).soldOut).toBe(true);
    expect(summarizeVariants([v({ id: 'a', stock: null })]).soldOut).toBe(false);
  });
});

describe('generateVariantCombos', () => {
  it('sinh tổ hợp theo thứ tự nhóm, bỏ khoảng trắng và giá trị trùng', () => {
    expect(generateVariantCombos(['Đen, Trắng', 'S, M, M '])).toEqual([
      'Đen / S',
      'Đen / M',
      'Trắng / S',
      'Trắng / M',
    ]);
  });
  it('bỏ qua nhóm rỗng', () => {
    expect(generateVariantCombos(['', '1 tháng, 3 tháng'])).toEqual(['1 tháng', '3 tháng']);
    expect(generateVariantCombos(['', ' '])).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `pnpm vitest run tests/unit/shop-variants.test.ts` — Expected: FAIL "Cannot find module '@/lib/shop/variants'".

- [ ] **Step 3: Implement**

```ts
// src/lib/shop/variants.ts
export type ProductTypeValue = 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';

export interface VariantSnapshot {
  id: string;
  name: string;
  priceVnd: number;
  compareAtVnd: number | null;
  stock: number | null;
  sortOrder: number;
  active: boolean;
}

export interface ProductForCart {
  id: string;
  name: string;
  slug: string;
  coverUrl: string;
  type: ProductTypeValue;
  status: string;
  saleMode: string;
  variants: VariantSnapshot[];
}

export interface CartLineInput {
  productId: string;
  variantId?: string | null;
  qty: number;
}

export interface ResolvedCartLine {
  productId: string;
  variantId: string;
  qty: number;
  product: ProductForCart;
  variant: VariantSnapshot;
}

export interface CartLineError {
  productId: string;
  variantId?: string | null;
  message: string;
}

export interface VariantSummary {
  minPriceVnd: number;
  maxPriceVnd: number;
  compareAtVnd: number | null;
  hasMultiple: boolean;
  soldOut: boolean;
}

/** Loại hàng đang cho phép mua. Giai đoạn 2 thêm PHYSICAL, giai đoạn 3 thêm ACCOUNT. */
export const PURCHASABLE_TYPES: readonly ProductTypeValue[] = ['DOWNLOAD'];

export function lineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

function byDisplayOrder(a: VariantSnapshot, b: VariantSnapshot) {
  return a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function pickDefaultVariant(variants: VariantSnapshot[]): VariantSnapshot | null {
  return variants.filter((variant) => variant.active).sort(byDisplayOrder)[0] ?? null;
}

/**
 * Chuẩn hóa giỏ hàng từ client: gắn biến thể mặc định cho dòng cũ, gộp dòng trùng,
 * kiểm tra loại hàng được bán và tồn kho. Không bao giờ throw.
 */
export function resolveCartLines(
  items: CartLineInput[],
  products: ProductForCart[],
  purchasable: readonly ProductTypeValue[] = PURCHASABLE_TYPES,
): { lines: ResolvedCartLine[]; errors: CartLineError[] } {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const merged = new Map<string, ResolvedCartLine>();
  const errors: CartLineError[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== 'ACTIVE') {
      errors.push({ productId: item.productId, message: 'Sản phẩm không còn được bán.' });
      continue;
    }
    if (!purchasable.includes(product.type)) {
      errors.push({
        productId: item.productId,
        variantId: item.variantId,
        message: `"${product.name}" đang ở trạng thái Sắp mở bán.`,
      });
      continue;
    }
    const variant = item.variantId
      ? product.variants.find((candidate) => candidate.id === item.variantId && candidate.active)
      : pickDefaultVariant(product.variants);
    if (!variant) {
      errors.push({
        productId: item.productId,
        variantId: item.variantId,
        message: `Lựa chọn của "${product.name}" không còn được bán.`,
      });
      continue;
    }
    const qty = Math.max(1, Math.floor(item.qty || 1));
    const key = lineKey(product.id, variant.id);
    const existing = merged.get(key);
    if (existing) existing.qty += qty;
    else merged.set(key, { productId: product.id, variantId: variant.id, qty, product, variant });
  }

  const lines: ResolvedCartLine[] = [];
  for (const line of merged.values()) {
    if (line.variant.stock !== null && line.qty > line.variant.stock) {
      errors.push({
        productId: line.productId,
        variantId: line.variantId,
        message: `"${line.product.name} – ${line.variant.name}" chỉ còn ${line.variant.stock}.`,
      });
      continue;
    }
    lines.push(line);
  }
  return { lines, errors };
}

export function summarizeVariants(variants: VariantSnapshot[]): VariantSummary {
  const active = variants.filter((variant) => variant.active);
  if (active.length === 0) {
    return {
      minPriceVnd: 0,
      maxPriceVnd: 0,
      compareAtVnd: null,
      hasMultiple: false,
      soldOut: true,
    };
  }
  const cheapest = active.reduce((min, variant) =>
    variant.priceVnd < min.priceVnd ? variant : min,
  );
  return {
    minPriceVnd: cheapest.priceVnd,
    maxPriceVnd: Math.max(...active.map((variant) => variant.priceVnd)),
    compareAtVnd: cheapest.compareAtVnd,
    hasMultiple: active.length > 1,
    soldOut: active.every((variant) => variant.stock !== null && variant.stock <= 0),
  };
}

/** ["Đen, Trắng", "S, M"] → ["Đen / S", "Đen / M", "Trắng / S", "Trắng / M"] */
export function generateVariantCombos(groups: string[]): string[] {
  const parsed = groups
    .map((group) => [
      ...new Set(
        group
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ])
    .filter((values) => values.length > 0);
  if (parsed.length === 0) return [];
  return parsed.reduce<string[]>(
    (combos, values) =>
      combos.flatMap((prefix) => values.map((value) => (prefix ? `${prefix} / ${value}` : value))),
    [''],
  );
}
```

- [ ] **Step 4: Chạy test pass**

Run: `pnpm vitest run tests/unit/shop-variants.test.ts` — Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shop/variants.ts tests/unit/shop-variants.test.ts
git commit -m "feat(shop): module thuần xử lý biến thể và dòng giỏ hàng"
```

---

### Task 3: Giỏ hàng + tính giá theo biến thể

**Files:**

- Create: `src/lib/shop/cart-items.ts`
- Modify: `src/lib/pricing.ts`, `src/hooks/use-cart.ts`
- Test: `tests/unit/shop-cart-items.test.ts`, bổ sung `tests/unit/pricing.test.ts`

**Interfaces:**

- Consumes: `lineKey` (Task 2).
- Produces:
  - `interface CartItem { productId: string; variantId?: string; qty: number }` (export từ `src/lib/shop/cart-items.ts`, `use-cart.ts` re-export)
  - `addLine(items: CartItem[], line: CartItem): CartItem[]`
  - `setLineQty(items: CartItem[], productId: string, variantId: string | undefined, qty: number): CartItem[]`
  - `removeLine(items: CartItem[], productId: string, variantId?: string): CartItem[]`
  - `migrateCartState(persisted: unknown): { items: CartItem[]; couponCode: string | null }`
  - Store: `addItem(productId, qty?, variantId?)`, `updateQty(productId, qty, variantId?)`, `removeItem(productId, variantId?)`
  - `CartItemInput`, `PricingItem` có thêm `variantId?: string`; `productsMap` key = `lineKey(productId, variantId)`.

- [ ] **Step 1: Viết test fail cho cart-items**

```ts
// tests/unit/shop-cart-items.test.ts
import { describe, it, expect } from 'vitest';
import { addLine, migrateCartState, removeLine, setLineQty } from '@/lib/shop/cart-items';

describe('cart-items', () => {
  it('addLine cộng dồn khi trùng productId + variantId, tách dòng khi khác biến thể', () => {
    let items = addLine([], { productId: 'p1', variantId: 'a', qty: 1 });
    items = addLine(items, { productId: 'p1', variantId: 'a', qty: 2 });
    items = addLine(items, { productId: 'p1', variantId: 'b', qty: 1 });
    expect(items).toEqual([
      { productId: 'p1', variantId: 'a', qty: 3 },
      { productId: 'p1', variantId: 'b', qty: 1 },
    ]);
  });

  it('setLineQty <= 0 thì xóa dòng; chỉ đụng đúng biến thể', () => {
    const items = [
      { productId: 'p1', variantId: 'a', qty: 1 },
      { productId: 'p1', variantId: 'b', qty: 1 },
    ];
    expect(setLineQty(items, 'p1', 'a', 5)[0]?.qty).toBe(5);
    expect(setLineQty(items, 'p1', 'a', 0)).toEqual([{ productId: 'p1', variantId: 'b', qty: 1 }]);
  });

  it('removeLine dòng legacy (không variantId) không xóa nhầm dòng có biến thể', () => {
    const items = [
      { productId: 'p1', qty: 1 },
      { productId: 'p1', variantId: 'a', qty: 1 },
    ];
    expect(removeLine(items, 'p1')).toEqual([{ productId: 'p1', variantId: 'a', qty: 1 }]);
  });

  it('migrateCartState giữ item cũ, bỏ item hỏng, không crash với dữ liệu rác', () => {
    expect(
      migrateCartState({
        items: [{ productId: 'p1', qty: 2 }, { qty: 1 }, 'x', { productId: 'p2', qty: -1 }],
        couponCode: 'SALE',
      }),
    ).toEqual({ items: [{ productId: 'p1', qty: 2 }], couponCode: 'SALE' });
    expect(migrateCartState(null)).toEqual({ items: [], couponCode: null });
    expect(migrateCartState({ items: 'bad' })).toEqual({ items: [], couponCode: null });
  });
});
```

- [ ] **Step 2: Chạy fail** — `pnpm vitest run tests/unit/shop-cart-items.test.ts` → FAIL module not found.

- [ ] **Step 3: Implement `src/lib/shop/cart-items.ts`**

```ts
export interface CartItem {
  productId: string;
  variantId?: string;
  qty: number;
}

function isSameLine(item: CartItem, productId: string, variantId?: string) {
  return item.productId === productId && (item.variantId ?? null) === (variantId ?? null);
}

export function addLine(items: CartItem[], line: CartItem): CartItem[] {
  const qty = Math.max(1, Math.floor(line.qty));
  const index = items.findIndex((item) => isSameLine(item, line.productId, line.variantId));
  if (index === -1) {
    return [
      ...items,
      { productId: line.productId, ...(line.variantId && { variantId: line.variantId }), qty },
    ];
  }
  return items.map((item, i) => (i === index ? { ...item, qty: item.qty + qty } : item));
}

export function setLineQty(
  items: CartItem[],
  productId: string,
  variantId: string | undefined,
  qty: number,
): CartItem[] {
  const validQty = Math.floor(qty);
  if (validQty <= 0) return removeLine(items, productId, variantId);
  return items.map((item) =>
    isSameLine(item, productId, variantId) ? { ...item, qty: validQty } : item,
  );
}

export function removeLine(items: CartItem[], productId: string, variantId?: string): CartItem[] {
  return items.filter((item) => !isSameLine(item, productId, variantId));
}

/** Đọc state giỏ từ localStorage (mọi phiên bản cũ), loại bỏ dữ liệu hỏng. */
export function migrateCartState(persisted: unknown): {
  items: CartItem[];
  couponCode: string | null;
} {
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as {
    items?: unknown;
    couponCode?: unknown;
  };
  const rawItems = Array.isArray(state.items) ? state.items : [];
  const items: CartItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const { productId, variantId, qty } = raw as Record<string, unknown>;
    if (typeof productId !== 'string' || !productId) continue;
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 1) continue;
    items.push({
      productId,
      ...(typeof variantId === 'string' && variantId && { variantId }),
      qty: Math.floor(qty),
    });
  }
  return { items, couponCode: typeof state.couponCode === 'string' ? state.couponCode : null };
}
```

- [ ] **Step 4: Chạy pass** — `pnpm vitest run tests/unit/shop-cart-items.test.ts` → PASS.

- [ ] **Step 5: Thêm test pricing theo biến thể vào cuối `describe` trong `tests/unit/pricing.test.ts`**

```ts
it('Tính giá theo biến thể: cùng sản phẩm, 2 biến thể giá khác nhau', () => {
  const variantMap = new Map<string, ProductPriceSnapshot>([
    ['shirt:black-m', { id: 'shirt', priceVnd: 150000, status: 'ACTIVE' }],
    ['shirt:white-l', { id: 'shirt', priceVnd: 170000, status: 'ACTIVE' }],
  ]);
  const result = calculatePricing({
    items: [
      { productId: 'shirt', variantId: 'black-m', qty: 2 },
      { productId: 'shirt', variantId: 'white-l', qty: 1 },
    ],
    productsMap: variantMap,
  });
  expect(result.subtotalVnd).toBe(470000);
  expect(result.items.map((item) => item.variantId)).toEqual(['black-m', 'white-l']);
});
```

- [ ] **Step 6: Chạy fail** — `pnpm vitest run tests/unit/pricing.test.ts` → FAIL (type/`variantId` undefined, subtotal 0).

- [ ] **Step 7: Sửa `src/lib/pricing.ts`**

Thêm import đầu file: `import { lineKey } from '@/lib/shop/variants';`

`CartItemInput` và `PricingItem` thêm `variantId?: string;`. Trong vòng lặp của `calculatePricing` đổi:

```ts
const product = productsMap.get(lineKey(item.productId, item.variantId));
```

và khi push:

```ts
pricingItems.push({
  productId: item.productId,
  ...(item.variantId && { variantId: item.variantId }),
  qty,
  unitPriceVnd,
  itemTotalVnd,
});
```

Cập nhật JSDoc của `productsMap`: `/** Key = lineKey(productId, variantId) */`.

- [ ] **Step 8: Chạy toàn bộ test** — `pnpm test` → PASS (test cũ dùng key = productId vẫn đúng vì `lineKey(p) === p`).

- [ ] **Step 9: Viết lại `src/hooks/use-cart.ts` dùng helper**

```ts
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  addLine,
  migrateCartState,
  removeLine,
  setLineQty,
  type CartItem,
} from '@/lib/shop/cart-items';

export type { CartItem };

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  isOpen: boolean;

  addItem: (productId: string, qty?: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clearCart: () => void;
  setCouponCode: (code: string | null) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalCount: () => number;
}

/**
 * Zustand Cart Store:
 * TUYỆT ĐỐI KHÔNG lưu giá tiền ở Client/LocalStorage.
 * Chỉ lưu { productId, variantId?, qty } và couponCode.
 */
export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      isOpen: false,

      addItem: (productId, qty = 1, variantId) =>
        set((state) => ({
          items: addLine(state.items, { productId, variantId, qty }),
          isOpen: true,
        })),

      removeItem: (productId, variantId) =>
        set((state) => ({ items: removeLine(state.items, productId, variantId) })),

      updateQty: (productId, qty, variantId) =>
        set((state) => ({ items: setLineQty(state.items, productId, variantId, qty) })),

      clearCart: () => set({ items: [], couponCode: null }),

      setCouponCode: (code) => set({ couponCode: code ? code.trim().toUpperCase() : null }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalCount: () => get().items.reduce((acc, item) => acc + item.qty, 0),
    }),
    {
      name: 'blog_cart_storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => migrateCartState(persisted),
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
      }),
    },
  ),
);
```

- [ ] **Step 10: Typecheck** — `pnpm typecheck` → PASS (các caller cũ `addItem(id, 1)` vẫn hợp lệ).

- [ ] **Step 11: Commit**

```bash
git add src/lib/shop/cart-items.ts src/lib/pricing.ts src/hooks/use-cart.ts tests/unit/shop-cart-items.test.ts tests/unit/pricing.test.ts
git commit -m "feat(shop): giỏ hàng và tính giá theo biến thể"
```

---

### Task 4: API giỏ hàng + checkout theo biến thể; drawer/checkout hiện biến thể

**Files:**

- Create: `src/lib/shop/cart-products.ts`
- Modify: `src/app/api/cart/validate/route.ts`, `src/app/api/checkout/route.ts`, `src/components/shop/cart-drawer.tsx`, `src/app/(shop)/checkout/page.tsx`

**Interfaces:**

- Consumes: `resolveCartLines`, `lineKey`, `ProductForCart` (Task 2); `calculatePricing` (Task 3).
- Produces:
  - `loadCartProducts(productIds: string[]): Promise<ProductForCart[]>` (trong `cart-products.ts`, chỉ lấy `status: 'ACTIVE', saleMode: 'PAID'`, include `variants`)
  - `buildPriceMap(lines: ResolvedCartLine[]): Map<string, ProductPriceSnapshot>`
  - Response `/api/cart/validate` → `data.items[]` có thêm `variantId: string`, `variantName: string`, `hasMultipleVariants: boolean`, `stockLeft: number | null`; `data.errors: string[]`.

- [ ] **Step 1: Tạo `src/lib/shop/cart-products.ts`**

```ts
import { db } from '@/lib/db';
import type { ProductPriceSnapshot } from '@/lib/pricing';
import { lineKey, type ProductForCart, type ResolvedCartLine } from '@/lib/shop/variants';

/** Đọc sản phẩm đang bán kèm biến thể, trả về dạng thuần cho resolveCartLines. */
export async function loadCartProducts(productIds: string[]): Promise<ProductForCart[]> {
  if (productIds.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: [...new Set(productIds)] }, status: 'ACTIVE', saleMode: 'PAID' },
    include: { variants: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    coverUrl: row.coverUrl,
    type: row.type,
    status: row.status,
    saleMode: row.saleMode,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceVnd: variant.priceVnd,
      compareAtVnd: variant.compareAtVnd,
      stock: variant.stock,
      sortOrder: variant.sortOrder,
      active: variant.active,
    })),
  }));
}

export function buildPriceMap(lines: ResolvedCartLine[]) {
  const map = new Map<string, ProductPriceSnapshot>();
  for (const line of lines) {
    map.set(lineKey(line.productId, line.variantId), {
      id: line.productId,
      priceVnd: line.variant.priceVnd,
      status: line.product.status,
    });
  }
  return map;
}
```

- [ ] **Step 2: Sửa `/api/cart/validate/route.ts`**

Schema item thêm `variantId: z.string().min(1).optional().nullable()`. Thay khối "1. Đọc giá…" tới "4. Tính toán…" bằng:

```ts
const products = await loadCartProducts(items.map((i) => i.productId));
const { lines, errors } = resolveCartLines(items, products);
const productsMap = buildPriceMap(lines);
// (giữ nguyên khối tìm coupon)
const pricing = calculatePricing({
  items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
  productsMap,
  coupon,
});
```

Thay `detailedItems`:

```ts
const lineMap = new Map(lines.map((line) => [lineKey(line.productId, line.variantId), line]));
const detailedItems = pricing.items.map((item) => {
  const line = lineMap.get(lineKey(item.productId, item.variantId));
  return {
    ...item,
    variantId: line?.variantId ?? '',
    variantName: line?.variant.name ?? '',
    hasMultipleVariants: (line?.product.variants.filter((v) => v.active).length ?? 0) > 1,
    stockLeft: line?.variant.stock ?? null,
    name: line?.product.name ?? 'Sản phẩm',
    slug: line?.product.slug ?? '',
    coverUrl: line?.product.coverUrl ?? '',
  };
});
```

Thêm `errors: errors.map((error) => error.message)` vào `data` của response (và `errors: []` ở nhánh giỏ rỗng). Import: `loadCartProducts, buildPriceMap` từ `@/lib/shop/cart-products`; `resolveCartLines, lineKey` từ `@/lib/shop/variants`. Xóa import `ProductPriceSnapshot` không còn dùng.

- [ ] **Step 3: Sửa `/api/checkout/route.ts`**

Schema item thêm `variantId: z.string().min(1).optional().nullable()`. Thay khối "1. Đọc sản phẩm…" (tới hết vòng `for (const p of dbProducts)`) bằng:

```ts
const products = await loadCartProducts(items.map((i) => i.productId));
const { lines, errors } = resolveCartLines(items, products);
if (errors.length > 0 || lines.length === 0) {
  return NextResponse.json(
    { error: errors[0]?.message ?? 'Không tìm thấy sản phẩm hợp lệ trong giỏ hàng.' },
    { status: 400 },
  );
}
const productsMap = buildPriceMap(lines);
const lineMap = new Map(lines.map((line) => [lineKey(line.productId, line.variantId), line]));
```

`calculatePricing({ items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })), productsMap, coupon })`.

Thêm helper trong file (trên `export async function POST`):

```ts
function orderItemData(
  item: { productId: string; variantId?: string; qty: number; unitPriceVnd: number },
  lineMap: Map<string, ResolvedCartLine>,
) {
  const line = lineMap.get(lineKey(item.productId, item.variantId));
  return {
    productId: item.productId,
    variantId: line?.variantId ?? null,
    variantNameSnapshot: line?.variant.name ?? null,
    productTypeSnapshot: line?.product.type ?? 'DOWNLOAD',
    qty: item.qty,
    unitPriceVnd: item.unitPriceVnd,
    productNameSnapshot: line?.product.name ?? 'Sản phẩm số',
  };
}
```

Ở cả 2 chỗ `items: { create: pricing.items.map(...) }` đổi thành `items: { create: pricing.items.map((item) => orderItemData(item, lineMap)) }`. Chỗ tạo license dùng `prod?.maxDownloads` → đọc lại: `const maxDownloads = (await tx.product.findUnique({ where: { id: orderItem.productId }, select: { maxDownloads: true } }))?.maxDownloads ?? 5;`. Xóa `productDetails` và import `ProductPriceSnapshot` không còn dùng. Import `ResolvedCartLine` từ `@/lib/shop/variants`.

Chú ý: phần tạo link PayOS phía dưới đang dùng `productDetails` cho tên item — đổi sang `lineMap.get(lineKey(item.productId, item.variantId))?.product.name`.

- [ ] **Step 4: Sửa `cart-drawer.tsx`**

- `ValidatedCartItem` thêm `variantId: string; variantName: string; hasMultipleVariants: boolean; stockLeft: number | null;`; response data thêm `errors?: string[]`.
- `key={item.productId}` → `key={`${item.productId}:${item.variantId}`}`.
- `updateQty(item.productId, item.qty - 1)` → `updateQty(item.productId, item.qty - 1, item.variantId)`; tương tự `+ 1` và `removeItem(item.productId, item.variantId)`.
- Nút `+` thêm `disabled={item.stockLeft !== null && item.qty >= item.stockLeft}`.
- Dưới tên sản phẩm, thêm: `{item.hasMultipleVariants && <p className="text-muted-foreground text-xs">{item.variantName}</p>}`.
- Trên danh sách items, nếu `cartData?.errors?.length` hiển thị: `<p role="alert" className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">{cartData.errors.join(' ')}</p>`.

Lưu ý về giỏ lưu trong store: dòng legacy không có `variantId` còn giữ nguyên trong localStorage; khi bấm +/− dòng đó dùng `item.variantId` (id mặc định) nên sẽ không khớp. Xử lý: sau khi fetch validate thành công, đồng bộ lại store — trong `useEffect` sau `setCartData(data)` gọi:

```ts
const legacy = items.filter((item) => !item.variantId);
if (legacy.length > 0) {
  const store = useCart.getState();
  for (const item of legacy) {
    const resolved = data.items.find((line) => line.productId === item.productId);
    store.removeItem(item.productId);
    if (resolved) store.addItem(item.productId, item.qty, resolved.variantId);
  }
}
```

(`addItem` mở drawer — chỉ chạy khi drawer đang mở nên không đổi hành vi thấy được.)

- [ ] **Step 5: Sửa `checkout/page.tsx`** — cùng thay đổi kiểu dữ liệu, `key`, hiển thị `variantName` như Step 4; hiển thị `cartData.errors` phía trên nút thanh toán và disable nút khi có lỗi.

- [ ] **Step 6: Kiểm tra**

Run: `pnpm typecheck && pnpm lint && pnpm test` → PASS.
Chạy thủ công: `pnpm dev`, thêm 1 sản phẩm Shop dạng file vào giỏ, mở `/checkout`: tổng tiền đúng, tạo được link PayOS (hoặc lỗi PayOS chưa cấu hình như trước). `psql … -c 'SELECT "variantId","variantNameSnapshot","productTypeSnapshot" FROM "OrderItem" ORDER BY id DESC LIMIT 1;'` → có giá trị.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shop/cart-products.ts src/app/api/cart/validate/route.ts src/app/api/checkout/route.ts src/components/shop/cart-drawer.tsx "src/app/(shop)/checkout/page.tsx"
git commit -m "feat(shop): giỏ hàng và checkout resolve biến thể, snapshot vào đơn"
```

---

### Task 5: Server action lưu trường Shop + đồng bộ biến thể

**Files:**

- Create: `src/lib/shop/variant-input.ts`
- Modify: `src/server/actions/product.ts`
- Test: `tests/unit/shop-variant-input.test.ts`

**Interfaces:**

- Produces:
  - `interface VariantInput { id?: string; name: string; sku: string | null; priceVnd: number; compareAtVnd: number | null; stock: number | null; active: boolean }`
  - `parseVariantsInput(raw: unknown): { ok: true; variants: VariantInput[] } | { ok: false; error: string }` — `sortOrder` = vị trí trong mảng
  - `planVariantSync(existing: { id: string; hasOrders: boolean }[], incoming: VariantInput[]): { create: (VariantInput & { sortOrder: number })[]; update: (VariantInput & { id: string; sortOrder: number })[]; deactivate: string[]; remove: string[] }`
  - Form field names mới: `type`, `category`, `condition`, `conditionNote`, `warrantyNote`, `deliveryMode`, `gallery` (JSON `string[]`), `variants` (JSON `VariantInput[]`).

- [ ] **Step 1: Viết test fail**

```ts
// tests/unit/shop-variant-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseVariantsInput, planVariantSync } from '@/lib/shop/variant-input';

describe('parseVariantsInput', () => {
  it('parse JSON hợp lệ, chuẩn hóa chuỗi rỗng thành null', () => {
    const result = parseVariantsInput(
      JSON.stringify([
        { name: ' Đen / M ', sku: '', priceVnd: 150000, compareAtVnd: '', stock: '', active: true },
      ]),
    );
    expect(result).toEqual({
      ok: true,
      variants: [
        {
          name: 'Đen / M',
          sku: null,
          priceVnd: 150000,
          compareAtVnd: null,
          stock: null,
          active: true,
        },
      ],
    });
  });

  it('từ chối rỗng, tên trùng, giá âm, stock âm, JSON hỏng', () => {
    expect(parseVariantsInput('[]').ok).toBe(false);
    expect(
      parseVariantsInput(
        JSON.stringify([
          { name: 'M', priceVnd: 1, active: true },
          { name: 'm', priceVnd: 1, active: true },
        ]),
      ),
    ).toEqual({ ok: false, error: 'Tên biến thể bị trùng: "m".' });
    expect(parseVariantsInput(JSON.stringify([{ name: 'M', priceVnd: -1, active: true }])).ok).toBe(
      false,
    );
    expect(
      parseVariantsInput(JSON.stringify([{ name: 'M', priceVnd: 1, stock: -2, active: true }])).ok,
    ).toBe(false);
    expect(parseVariantsInput('{bad').ok).toBe(false);
    expect(parseVariantsInput(null).ok).toBe(false);
  });

  it('từ chối giá gạch nhỏ hơn hoặc bằng giá bán', () => {
    const result = parseVariantsInput(
      JSON.stringify([{ name: 'M', priceVnd: 100, compareAtVnd: 100, active: true }]),
    );
    expect(result.ok).toBe(false);
  });
});

describe('planVariantSync', () => {
  const base = { sku: null, priceVnd: 1, compareAtVnd: null, stock: null, active: true };

  it('tạo mới dòng không có id, cập nhật dòng có id, gán sortOrder theo thứ tự', () => {
    const plan = planVariantSync(
      [{ id: 'a', hasOrders: false }],
      [
        { ...base, name: 'Mới' },
        { ...base, id: 'a', name: 'Cũ' },
      ],
    );
    expect(plan.create).toEqual([{ ...base, name: 'Mới', sortOrder: 0 }]);
    expect(plan.update).toEqual([{ ...base, id: 'a', name: 'Cũ', sortOrder: 1 }]);
    expect(plan.remove).toEqual([]);
    expect(plan.deactivate).toEqual([]);
  });

  it('biến thể bị bỏ khỏi form: có đơn → deactivate, chưa có đơn → remove', () => {
    const plan = planVariantSync(
      [
        { id: 'sold', hasOrders: true },
        { id: 'fresh', hasOrders: false },
      ],
      [{ ...base, name: 'Khác' }],
    );
    expect(plan.deactivate).toEqual(['sold']);
    expect(plan.remove).toEqual(['fresh']);
  });

  it('id lạ (không thuộc sản phẩm) được coi như tạo mới', () => {
    const plan = planVariantSync([], [{ ...base, id: 'foreign', name: 'X' }]);
    expect(plan.update).toEqual([]);
    expect(plan.create[0]).toEqual({ ...base, name: 'X', sortOrder: 0 });
  });
});
```

- [ ] **Step 2: Chạy fail** — `pnpm vitest run tests/unit/shop-variant-input.test.ts` → FAIL module not found.

- [ ] **Step 3: Implement `src/lib/shop/variant-input.ts`**

```ts
import { z } from 'zod';

const MAX_INT = 2147483647;
const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const variantSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1, 'Tên biến thể không được để trống.').max(100),
    sku: z.preprocess(emptyToNull, z.string().trim().max(64).nullable()),
    priceVnd: z.coerce.number().int().min(0, 'Giá biến thể không được âm.').max(MAX_INT),
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
```

Nếu eslint báo `_ignored` unused, dùng `// eslint-disable-next-line @typescript-eslint/no-unused-vars` ngay trên dòng đó.

- [ ] **Step 4: Chạy pass** — `pnpm vitest run tests/unit/shop-variant-input.test.ts` → PASS.

- [ ] **Step 5: Sửa `src/server/actions/product.ts`**

Mở rộng `schema`:

```ts
  type: z.enum(['DOWNLOAD', 'PHYSICAL', 'ACCOUNT']).default('DOWNLOAD'),
  category: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['APPAREL', 'HAT', 'MUG', 'ACCESSORY', 'TECH', 'ACCOUNT', 'OTHER']).optional(),
  ),
  condition: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['NEW', 'LIKE_NEW', 'USED']).optional(),
  ),
  conditionNote: z.string().trim().max(300).optional().default(''),
  warrantyNote: z.string().trim().max(300).optional().default(''),
  deliveryMode: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['AUTO', 'MANUAL']).optional(),
  ),
```

`Object.fromEntries(form)` sẽ chứa cả `gallery`, `variants`, `file` — lấy riêng các trường mới rồi loại khỏi `data` trước khi ghi DB. Ngay sau `const data = parsed.data;`:

```ts
const isShopGoods = data.kind === 'SHOP' && data.type !== 'DOWNLOAD';
if (data.kind === 'SOURCE_CODE') data.type = 'DOWNLOAD';
if (data.kind === 'SHOP' && !data.category) return { error: 'Vui lòng chọn danh mục.' };
if (data.type === 'ACCOUNT' && !data.deliveryMode)
  return { error: 'Vui lòng chọn cách bàn giao tài khoản.' };

let gallery: string[] = [];
try {
  const rawGallery = JSON.parse(String(form.get('gallery') || '[]'));
  gallery = z
    .array(
      z
        .string()
        .trim()
        .max(500)
        .refine((url) => url.startsWith('/') || /^https?:\/\//.test(url)),
    )
    .max(20)
    .parse(rawGallery);
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
  const cheapest = [...active].sort((a, b) => a.priceVnd - b.priceVnd)[0];
  data.priceVnd = cheapest?.priceVnd ?? 0;
} else {
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

const shopFields = {
  type: data.type,
  category: data.kind === 'SHOP' ? (data.category ?? null) : null,
  condition: data.category === 'TECH' ? (data.condition ?? null) : null,
  conditionNote: data.category === 'TECH' ? data.conditionNote || null : null,
  warrantyNote: data.warrantyNote || null,
  deliveryMode: data.type === 'ACCOUNT' ? (data.deliveryMode ?? null) : null,
  gallery,
};
```

Đổi điều kiện bắt file: `if (data.status === 'ACTIVE' && !isShopGoods && data.saleMode !== 'CONTACT' && !file && !existing?.files.length)`.

Tách field ghi DB: ngay trước khối `try`, thêm

```ts
const {
  type: _type,
  category: _category,
  condition: _condition,
  conditionNote: _conditionNote,
  warrantyNote: _warrantyNote,
  deliveryMode: _deliveryMode,
  ...baseData
} = data;
const productData = { ...baseData, ...shopFields };
```

(thêm `/* eslint-disable @typescript-eslint/no-unused-vars */` … `/* eslint-enable */` bao quanh khối destructure nếu lint báo).

Trong `try`: thay `{ ...data, compareAtVnd: null, files }` bằng `{ ...productData, compareAtVnd: null, files }`, và `{ ...data, files }` bằng `{ ...productData, files }`. Sau khi có `savedId`, đồng bộ biến thể:

```ts
const existingVariants = await db.productVariant.findMany({
  where: { productId: savedId },
  select: { id: true, name: true, _count: { select: { orderItems: true } } },
});
// Sản phẩm file tải về: giữ id của biến thể "Mặc định" hiện có để không đứt đơn cũ.
if (!isShopGoods && existingVariants[0])
  variantInputs[0] = { ...variantInputs[0]!, id: existingVariants[0].id };
const plan = planVariantSync(
  existingVariants.map((variant) => ({ id: variant.id, hasOrders: variant._count.orderItems > 0 })),
  variantInputs,
);
await db.$transaction([
  db.productVariant.deleteMany({ where: { id: { in: plan.remove } } }),
  db.productVariant.updateMany({ where: { id: { in: plan.deactivate } }, data: { active: false } }),
  ...plan.update.map(({ id, ...variant }) =>
    db.productVariant.update({ where: { id }, data: variant }),
  ),
  ...plan.create.map((variant) =>
    db.productVariant.create({ data: { ...variant, productId: savedId } }),
  ),
]);
```

Lưu ý `savedId` với sản phẩm cũ = `id` (đã gán ở đầu), sản phẩm mới = `created.id`. Lỗi trùng `sku` (Prisma `P2002`) → trong `catch` thêm:

```ts
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
  return { error: 'SKU bị trùng với biến thể khác.' };
```

(import `Prisma` từ `@prisma/client`). Import `parseVariantsInput, planVariantSync, type VariantInput` từ `@/lib/shop/variant-input`.

- [ ] **Step 6: Kiểm tra** — `pnpm typecheck && pnpm lint && pnpm test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shop/variant-input.ts src/server/actions/product.ts tests/unit/shop-variant-input.test.ts
git commit -m "feat(shop): lưu loại hàng, danh mục, gallery và đồng bộ biến thể"
```

---

### Task 6: Form admin Shop (loại hàng, chi tiết, gallery, bảng biến thể)

**Files:**

- Create: `src/lib/shop/labels.ts`, `src/components/admin/shop/shop-details-section.tsx`, `src/components/admin/shop/gallery-picker.tsx`, `src/components/admin/shop/variant-table.tsx`
- Modify: `src/components/admin/product-form.tsx`, `src/components/admin/product-editor-page.tsx`

**Interfaces:**

- Consumes: `generateVariantCombos` (Task 2), `VariantInput` (Task 5), `uploadCoverImage` (có sẵn, `src/server/actions/post.ts`).
- Produces:
  - `src/lib/shop/labels.ts`: `SHOP_CATEGORY_OPTIONS: { value: ShopCategoryValue; slug: string; label: string }[]`, `CONDITION_OPTIONS: { value: ItemConditionValue; slug: string; label: string }[]`, `PRODUCT_TYPE_OPTIONS`, types `ShopCategoryValue`, `ItemConditionValue`, `categoryLabel(value)`, `conditionLabel(value)`.
  - `ShopDetailsSection` props `{ type; category; condition; conditionNote; warrantyNote; deliveryMode; onChange(patch) }`, render hidden inputs cùng tên field của Task 5.
  - `GalleryPicker` props `{ defaultValue: string[]; onUploadStart(); onUploadEnd() }`, render `<input type="hidden" name="gallery" value={JSON.stringify(urls)} />`.
  - `VariantTable` props `{ defaultValue: (VariantInput & { id?: string })[] }`, render `<input type="hidden" name="variants" value={JSON.stringify(rows)} />`.
  - `ProductForm` `Product` type thêm: `type, category, condition, conditionNote, warrantyNote, deliveryMode, gallery, variants`.

- [ ] **Step 1: Tạo `src/lib/shop/labels.ts`**

```ts
export type ProductTypeOption = 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
export type ShopCategoryValue =
  'APPAREL' | 'HAT' | 'MUG' | 'ACCESSORY' | 'TECH' | 'ACCOUNT' | 'OTHER';
export type ItemConditionValue = 'NEW' | 'LIKE_NEW' | 'USED';

export const PRODUCT_TYPE_OPTIONS: { value: ProductTypeOption; label: string; hint: string }[] = [
  {
    value: 'PHYSICAL',
    label: '👕 Đồ vật lý',
    hint: 'Quần áo, mũ, cốc, đồ công nghệ… cần giao hàng',
  },
  {
    value: 'ACCOUNT',
    label: '🔑 Tài khoản số',
    hint: 'Netflix, Codex… bàn giao thông tin đăng nhập',
  },
  { value: 'DOWNLOAD', label: '📦 File tải về', hint: 'Ebook, template, file số' },
];

export const SHOP_CATEGORY_OPTIONS: { value: ShopCategoryValue; slug: string; label: string }[] = [
  { value: 'APPAREL', slug: 'quan-ao', label: 'Quần áo' },
  { value: 'HAT', slug: 'mu', label: 'Mũ' },
  { value: 'MUG', slug: 'coc', label: 'Cốc' },
  { value: 'ACCESSORY', slug: 'phu-kien', label: 'Phụ kiện' },
  { value: 'TECH', slug: 'do-cong-nghe', label: 'Đồ công nghệ' },
  { value: 'ACCOUNT', slug: 'tai-khoan', label: 'Tài khoản' },
  { value: 'OTHER', slug: 'khac', label: 'Khác' },
];

export const CONDITION_OPTIONS: { value: ItemConditionValue; slug: string; label: string }[] = [
  { value: 'NEW', slug: 'moi', label: 'Mới' },
  { value: 'LIKE_NEW', slug: 'nhu-moi', label: 'Như mới' },
  { value: 'USED', slug: 'da-dung', label: 'Đã dùng' },
];

export function categoryLabel(value: string | null | undefined) {
  return SHOP_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

export function conditionLabel(value: string | null | undefined) {
  return CONDITION_OPTIONS.find((option) => option.value === value)?.label ?? '';
}
```

- [ ] **Step 2: Tạo `shop-details-section.tsx`**

```tsx
'use client';

import {
  CONDITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  SHOP_CATEGORY_OPTIONS,
  type ItemConditionValue,
  type ProductTypeOption,
  type ShopCategoryValue,
} from '@/lib/shop/labels';

export interface ShopDetailsValue {
  type: ProductTypeOption;
  category: ShopCategoryValue | '';
  condition: ItemConditionValue | '';
  conditionNote: string;
  warrantyNote: string;
  deliveryMode: 'AUTO' | 'MANUAL' | '';
}

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';

export function ShopDetailsSection({
  value,
  onChange,
  typeLocked,
}: {
  value: ShopDetailsValue;
  onChange: (patch: Partial<ShopDetailsValue>) => void;
  typeLocked: boolean;
}) {
  return (
    <div className="space-y-4">
      <input type="hidden" name="type" value={value.type} />
      <input type="hidden" name="category" value={value.category} />
      <input
        type="hidden"
        name="condition"
        value={value.category === 'TECH' ? value.condition : ''}
      />
      <input
        type="hidden"
        name="deliveryMode"
        value={value.type === 'ACCOUNT' ? value.deliveryMode : ''}
      />

      <div className="space-y-2 text-sm">
        <p className="font-medium">Loại hàng</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRODUCT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={typeLocked && option.value !== value.type}
              onClick={() =>
                onChange({
                  type: option.value,
                  ...(option.value === 'ACCOUNT' && { category: 'ACCOUNT' as const }),
                  ...(option.value !== 'ACCOUNT' &&
                    value.category === 'ACCOUNT' && { category: '' as const }),
                })
              }
              className={`rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                value.type === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            </button>
          ))}
        </div>
        {typeLocked && (
          <p className="text-muted-foreground text-xs">
            Sản phẩm đã có đơn hàng nên không đổi loại hàng được.
          </p>
        )}
      </div>

      <label className="block space-y-2 text-sm">
        Danh mục
        <select
          className={inputClass}
          value={value.category}
          onChange={(event) => onChange({ category: event.target.value as ShopCategoryValue })}
          required
        >
          <option value="">— Chọn danh mục —</option>
          {SHOP_CATEGORY_OPTIONS.filter((option) =>
            value.type === 'ACCOUNT' ? option.value === 'ACCOUNT' : option.value !== 'ACCOUNT',
          ).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {value.category === 'TECH' && (
        <>
          <div className="space-y-2 text-sm">
            <p>Tình trạng</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ condition: option.value })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    value.condition === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-2 text-sm">
            Mô tả tình trạng
            <textarea
              name="conditionNote"
              className={`${inputClass} min-h-20`}
              maxLength={300}
              placeholder="Ví dụ: Trầy nhẹ cạnh, pin 88%, đủ hộp sạc"
              value={value.conditionNote}
              onChange={(event) => onChange({ conditionNote: event.target.value })}
            />
          </label>
        </>
      )}

      {value.type === 'ACCOUNT' && (
        <label className="block space-y-2 text-sm">
          Cách bàn giao
          <select
            className={inputClass}
            value={value.deliveryMode}
            onChange={(event) =>
              onChange({ deliveryMode: event.target.value as 'AUTO' | 'MANUAL' })
            }
            required
          >
            <option value="">— Chọn cách bàn giao —</option>
            <option value="AUTO">Tự động từ kho tài khoản</option>
            <option value="MANUAL">Thủ công (bạn gửi sau khi khách trả tiền)</option>
          </select>
        </label>
      )}

      <label className="block space-y-2 text-sm">
        Bảo hành
        <input
          name="warrantyNote"
          className={inputClass}
          maxLength={300}
          placeholder={
            value.type === 'ACCOUNT' ? 'Ví dụ: Bảo hành đủ thời hạn gói' : 'Ví dụ: Bảo hành 7 ngày'
          }
          value={value.warrantyNote}
          onChange={(event) => onChange({ warrantyNote: event.target.value })}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Tạo `gallery-picker.tsx`**

```tsx
'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadCoverImage } from '@/server/actions/post';

const MAX_IMAGES = 20;

export function GalleryPicker({
  defaultValue,
  onUploadStart,
  onUploadEnd,
}: {
  defaultValue: string[];
  onUploadStart: () => void;
  onUploadEnd: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - urls.length;
    const selected = Array.from(files).slice(0, room);
    if (selected.length === 0) {
      setError(`Tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    setError('');
    setUploading(true);
    onUploadStart();
    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.set('file', file);
        const result = await uploadCoverImage(formData);
        if (result.success && result.url) setUrls((prev) => [...prev, result.url!]);
        else setError(result.error || `Không tải được "${file.name}".`);
      }
    } catch {
      setError('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setUploading(false);
      onUploadEnd();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (index: number, delta: number) =>
    setUrls((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  return (
    <div className="space-y-3">
      <input type="hidden" name="gallery" value={JSON.stringify(urls)} />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(event) => upload(event.target.files)}
      />
      {urls.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {urls.map((url, index) => (
            <li
              key={url}
              className="border-border group relative overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="p-1 text-white"
                  title="Lên trước"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="p-1 text-white"
                  title="Xuống sau"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setUrls((prev) => prev.filter((item) => item !== url))}
                  className="p-1 text-red-300"
                  title="Xóa ảnh"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading || urls.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        Thêm ảnh từ máy ({urls.length}/{MAX_IMAGES})
      </Button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Tạo `variant-table.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateVariantCombos } from '@/lib/shop/variants';

export interface VariantRow {
  key: string;
  id?: string;
  name: string;
  sku: string;
  priceVnd: string;
  compareAtVnd: string;
  stock: string;
  active: boolean;
}

export interface VariantTableDefault {
  id?: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  compareAtVnd: number | null;
  stock: number | null;
  active: boolean;
}

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;

function toRow(variant: VariantTableDefault): VariantRow {
  return {
    key: variant.id ?? newKey(),
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? '',
    priceVnd: String(variant.priceVnd),
    compareAtVnd: variant.compareAtVnd === null ? '' : String(variant.compareAtVnd),
    stock: variant.stock === null ? '' : String(variant.stock),
    active: variant.active,
  };
}

const emptyRow = (name = ''): VariantRow => ({
  key: newKey(),
  name,
  sku: '',
  priceVnd: '',
  compareAtVnd: '',
  stock: '',
  active: true,
});

const cellClass =
  'border-border bg-background w-full min-w-0 rounded-md border px-2 py-1.5 text-sm';

export function VariantTable({
  defaultValue,
  stockReadOnly = false,
}: {
  defaultValue: VariantTableDefault[];
  stockReadOnly?: boolean;
}) {
  const [rows, setRows] = useState<VariantRow[]>(
    defaultValue.length ? defaultValue.map(toRow) : [emptyRow('Mặc định')],
  );
  const [groupA, setGroupA] = useState('');
  const [groupB, setGroupB] = useState('');

  const update = (key: string, patch: Partial<VariantRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const quickGenerate = () => {
    const names = generateVariantCombos([groupA, groupB]);
    setRows((prev) => {
      const existing = new Set(prev.map((row) => row.name.trim().toLowerCase()));
      const basePrice = prev.find((row) => row.priceVnd)?.priceVnd ?? '';
      const onlyPlaceholder = prev.length === 1 && prev[0]?.name === 'Mặc định' && !prev[0].id;
      const additions = names
        .filter((name) => !existing.has(name.toLowerCase()))
        .map((name) => ({ ...emptyRow(name), priceVnd: basePrice }));
      return onlyPlaceholder && additions.length ? additions : [...prev, ...additions];
    });
  };

  const serialized = rows.map((row) => ({
    ...(row.id && { id: row.id }),
    name: row.name,
    sku: row.sku,
    priceVnd: row.priceVnd === '' ? 0 : Number(row.priceVnd),
    compareAtVnd: row.compareAtVnd,
    stock: stockReadOnly ? '' : row.stock,
    active: row.active,
  }));

  return (
    <div className="space-y-4">
      <input type="hidden" name="variants" value={JSON.stringify(serialized)} />

      <div className="bg-muted/30 border-border grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={cellClass}
          placeholder="Nhóm 1, ví dụ: Đen, Trắng"
          value={groupA}
          onChange={(event) => setGroupA(event.target.value)}
        />
        <input
          className={cellClass}
          placeholder="Nhóm 2, ví dụ: S, M, L"
          value={groupB}
          onChange={(event) => setGroupB(event.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={quickGenerate}>
          <Wand2 className="size-4" /> Tạo nhanh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="pb-2">Tên biến thể</th>
              <th className="pb-2">Giá (đ)</th>
              <th className="pb-2">Giá gạch</th>
              <th className="pb-2">Tồn kho</th>
              <th className="pb-2">SKU</th>
              <th className="pb-2 text-center">Bán</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row) => (
              <tr key={row.key} className={row.active ? '' : 'opacity-50'}>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    value={row.name}
                    required
                    maxLength={100}
                    onChange={(event) => update(row.key, { name: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    type="number"
                    min="0"
                    step="1000"
                    value={row.priceVnd}
                    required
                    onChange={(event) => update(row.key, { priceVnd: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    type="number"
                    min="0"
                    step="1000"
                    value={row.compareAtVnd}
                    onChange={(event) => update(row.key, { compareAtVnd: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    type="number"
                    min="0"
                    step="1"
                    placeholder={stockReadOnly ? 'Theo kho' : '∞'}
                    disabled={stockReadOnly}
                    value={stockReadOnly ? '' : row.stock}
                    onChange={(event) => update(row.key, { stock: event.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={cellClass}
                    value={row.sku}
                    maxLength={64}
                    onChange={(event) => update(row.key, { sku: event.target.value })}
                  />
                </td>
                <td className="py-1.5 text-center">
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={row.active}
                    onChange={(event) => update(row.key, { active: event.target.checked })}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((item) => item.key !== row.key))}
                    className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-30"
                    title="Xóa biến thể"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRows((prev) => [...prev, emptyRow()])}
      >
        <Plus className="size-4" /> Thêm biến thể
      </Button>
      <p className="text-muted-foreground text-xs">
        Để trống tồn kho = không giới hạn. Biến thể đã có đơn hàng khi xóa sẽ chỉ bị ẩn, không mất
        lịch sử đơn.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Gắn vào `product-form.tsx`**

1. `type Product` thêm:

```ts
  type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
  category: string | null;
  condition: string | null;
  conditionNote: string | null;
  warrantyNote: string | null;
  deliveryMode: 'AUTO' | 'MANUAL' | null;
  gallery: string[];
  hasOrders: boolean;
  variants: VariantTableDefault[];
```

2. Import `ShopDetailsSection, type ShopDetailsValue`, `GalleryPicker`, `VariantTable, type VariantTableDefault`.
3. State trong `ProductForm`:

```ts
const [shop, setShop] = useState<ShopDetailsValue>({
  type: product?.type ?? (kind === 'SHOP' ? 'PHYSICAL' : 'DOWNLOAD'),
  category: (product?.category as ShopDetailsValue['category']) ?? '',
  condition: (product?.condition as ShopDetailsValue['condition']) ?? '',
  conditionNote: product?.conditionNote ?? '',
  warrantyNote: product?.warrantyNote ?? '',
  deliveryMode: product?.deliveryMode ?? '',
});
const isShopGoods = kind === 'SHOP' && shop.type !== 'DOWNLOAD';
```

4. Cột chính (`<div className="min-w-0 space-y-6">`), ngay đầu, nếu `kind === 'SHOP'`:

```tsx
{
  kind === 'SHOP' && (
    <section className={panelClass}>
      <h2 className="font-semibold">Loại hàng & thông tin bán</h2>
      <ShopDetailsSection
        value={shop}
        onChange={(patch) => setShop((prev) => ({ ...prev, ...patch }))}
        typeLocked={Boolean(product?.hasOrders)}
      />
    </section>
  );
}
```

và sau section thông tin sản phẩm, nếu `isShopGoods`:

```tsx
{
  isShopGoods && (
    <section className={panelClass}>
      <h2 className="font-semibold">Biến thể & giá</h2>
      <VariantTable
        defaultValue={product?.variants ?? []}
        stockReadOnly={shop.type === 'ACCOUNT' && shop.deliveryMode === 'AUTO'}
      />
    </section>
  );
}
```

5. Sidebar: sau section "Ảnh bìa", nếu `kind === 'SHOP'` thêm section "Thư viện ảnh" chứa `<GalleryPicker defaultValue={product?.gallery ?? []} onUploadStart={…} onUploadEnd={…} />` (cùng callback `setUploadCount` như `CoverPicker`). Nếu `kind !== 'SHOP'` render `<input type="hidden" name="gallery" value="[]" />`.
6. Bọc section "Hình thức & giá bán" và section file bàn giao bằng `{!isShopGoods && (…)}`; khi `isShopGoods` render thay thế `<input type="hidden" name="saleMode" value="PAID" /><input type="hidden" name="priceVnd" value="0" />`.
7. Ô "Số phiên bản": khi `isShopGoods` thay bằng `<input type="hidden" name="version" value={version} />`.
8. `publishLabel`: khi `isShopGoods` và chưa đăng → `'Đăng bán sản phẩm'`.
9. Với `kind === 'SOURCE_CODE'` render `<input type="hidden" name="type" value="DOWNLOAD" />` để schema nhận đúng.

- [ ] **Step 6: Truyền dữ liệu trong `product-editor-page.tsx`**

Query đổi `include: { files: true, variants: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, _count: { select: { orderItems: true } } }`. Object `product` truyền vào form thêm:

```ts
                type: product.type,
                category: product.category,
                condition: product.condition,
                conditionNote: product.conditionNote,
                warrantyNote: product.warrantyNote,
                deliveryMode: product.deliveryMode,
                gallery: product.gallery,
                hasOrders: product._count.orderItems > 0,
                variants: product.variants.map((variant) => ({
                  id: variant.id,
                  name: variant.name,
                  sku: variant.sku,
                  priceVnd: variant.priceVnd,
                  compareAtVnd: variant.compareAtVnd,
                  stock: variant.stock,
                  active: variant.active,
                })),
```

- [ ] **Step 7: Kiểm tra**

Run: `pnpm typecheck && pnpm lint && pnpm test` → PASS.
Thủ công (`pnpm dev`, `/admin/shop/new`):

1. Chọn 👕 Đồ vật lý → danh mục Quần áo → Tạo nhanh "Đen, Trắng" × "S, M" → 4 dòng, nhập giá 150000 → Lưu nháp → mở lại thấy đủ 4 biến thể đúng thứ tự.
2. Xóa 1 dòng → Lưu → còn 3.
3. Danh mục Đồ công nghệ → hiện chọn Tình trạng + mô tả.
4. 🔑 Tài khoản số → danh mục tự thành Tài khoản, bắt chọn cách bàn giao; chọn Tự động → cột Tồn kho bị khóa.
5. Thêm 3 ảnh gallery, đổi thứ tự, lưu → giữ thứ tự.
6. `/admin/source-code/new` vẫn như cũ (không có section Shop).

- [ ] **Step 8: Commit**

```bash
git add src/lib/shop/labels.ts src/components/admin/shop src/components/admin/product-form.tsx src/components/admin/product-editor-page.tsx
git commit -m "feat(admin): form Shop với loại hàng, tình trạng, gallery và bảng biến thể"
```

---

### Task 7: Trang `/shop` có lọc + thẻ sản phẩm giá "từ X đ"

**Files:**

- Create: `src/lib/shop/filters.ts`
- Modify: `src/app/shop/page.tsx`, `src/components/shop/product-card.tsx`
- Test: `tests/unit/shop-filters.test.ts`

**Interfaces:**

- Consumes: `SHOP_CATEGORY_OPTIONS`, `CONDITION_OPTIONS`, `conditionLabel` (Task 6), `summarizeVariants`, `VariantSummary` (Task 2).
- Produces:
  - `parseShopFilters(params: Record<string, string | string[] | undefined>): { category?: ShopCategoryValue; condition?: ItemConditionValue; categorySlug?: string; conditionSlug?: string }`
  - `buildShopWhere(filters): Prisma.ProductWhereInput`
  - `ProductCard` prop mới (tùy chọn): `shop?: { type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT'; condition: string | null; summary: VariantSummary }`

- [ ] **Step 1: Viết test fail**

```ts
// tests/unit/shop-filters.test.ts
import { describe, it, expect } from 'vitest';
import { buildShopWhere, parseShopFilters } from '@/lib/shop/filters';

describe('parseShopFilters', () => {
  it('đọc slug danh mục và tình trạng hợp lệ', () => {
    expect(parseShopFilters({ c: 'do-cong-nghe', cond: 'nhu-moi' })).toEqual({
      category: 'TECH',
      categorySlug: 'do-cong-nghe',
      condition: 'LIKE_NEW',
      conditionSlug: 'nhu-moi',
    });
  });
  it('bỏ qua giá trị rác, mảng và tình trạng khi không phải đồ công nghệ', () => {
    expect(parseShopFilters({ c: 'abc', cond: 'moi' })).toEqual({});
    expect(parseShopFilters({ c: ['quan-ao', 'mu'] })).toEqual({
      category: 'APPAREL',
      categorySlug: 'quan-ao',
    });
    expect(parseShopFilters({ c: 'quan-ao', cond: 'moi' })).toEqual({
      category: 'APPAREL',
      categorySlug: 'quan-ao',
    });
    expect(parseShopFilters({})).toEqual({});
  });
});

describe('buildShopWhere', () => {
  it('luôn lọc Shop đang bán, thêm category/condition khi có', () => {
    expect(buildShopWhere({})).toEqual({ status: 'ACTIVE', kind: 'SHOP' });
    expect(buildShopWhere({ category: 'TECH', condition: 'USED' })).toEqual({
      status: 'ACTIVE',
      kind: 'SHOP',
      category: 'TECH',
      condition: 'USED',
    });
  });
});
```

- [ ] **Step 2: Chạy fail** — `pnpm vitest run tests/unit/shop-filters.test.ts` → FAIL module not found.

- [ ] **Step 3: Implement `src/lib/shop/filters.ts`**

```ts
import type { Prisma } from '@prisma/client';
import {
  CONDITION_OPTIONS,
  SHOP_CATEGORY_OPTIONS,
  type ItemConditionValue,
  type ShopCategoryValue,
} from '@/lib/shop/labels';

export interface ShopFilters {
  category?: ShopCategoryValue;
  categorySlug?: string;
  condition?: ItemConditionValue;
  conditionSlug?: string;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseShopFilters(
  params: Record<string, string | string[] | undefined>,
): ShopFilters {
  const category = SHOP_CATEGORY_OPTIONS.find((option) => option.slug === first(params.c));
  if (!category) return {};
  const filters: ShopFilters = { category: category.value, categorySlug: category.slug };
  if (category.value === 'TECH') {
    const condition = CONDITION_OPTIONS.find((option) => option.slug === first(params.cond));
    if (condition) {
      filters.condition = condition.value;
      filters.conditionSlug = condition.slug;
    }
  }
  return filters;
}

export function buildShopWhere(filters: ShopFilters): Prisma.ProductWhereInput {
  return {
    status: 'ACTIVE',
    kind: 'SHOP',
    ...(filters.category && { category: filters.category }),
    ...(filters.condition && { condition: filters.condition }),
  };
}
```

- [ ] **Step 4: Chạy pass** — `pnpm vitest run tests/unit/shop-filters.test.ts` → PASS.

- [ ] **Step 5: Sửa `src/app/shop/page.tsx`**

- Xóa `export const revalidate = 3600;` (trang đọc `searchParams` nên dynamic).
- Signature: `export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> })`, `const filters = parseShopFilters(await searchParams);`
- Query: `db.product.findMany({ where: buildShopWhere(filters), include: { variants: true }, orderBy: { createdAt: 'desc' } })`; kiểu biến `products` đổi thành `Awaited<ReturnType<typeof loadProducts>>` với `loadProducts` là hàm cục bộ bọc query này (để type có `variants`).
- Giữa hero và grid thêm thanh tab:

```tsx
<nav className="flex flex-wrap gap-2" aria-label="Lọc danh mục">
  <Link href="/shop" className={tabClass(!filters.category)}>
    Tất cả
  </Link>
  {SHOP_CATEGORY_OPTIONS.filter((option) => option.value !== 'OTHER').map((option) => (
    <Link
      key={option.slug}
      href={`/shop?c=${option.slug}`}
      className={tabClass(filters.category === option.value)}
    >
      {option.label}
    </Link>
  ))}
</nav>;
{
  filters.category === 'TECH' && (
    <nav className="flex flex-wrap gap-2" aria-label="Lọc tình trạng">
      <Link href="/shop?c=do-cong-nghe" className={tabClass(!filters.condition, true)}>
        Mọi tình trạng
      </Link>
      {CONDITION_OPTIONS.map((option) => (
        <Link
          key={option.slug}
          href={`/shop?c=do-cong-nghe&cond=${option.slug}`}
          className={tabClass(filters.condition === option.value, true)}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
```

với helper trong file:

```ts
function tabClass(active: boolean, small = false) {
  return `rounded-full border font-medium transition ${small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} ${
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
  }`;
}
```

- Empty state khi có filter: "Chưa có sản phẩm trong danh mục này." kèm link "Xem tất cả".
- Map card: `<ProductCard key={product.id} product={product} shop={{ type: product.type, condition: product.condition, summary: summarizeVariants(product.variants) }} />`.

- [ ] **Step 6: Sửa `src/components/shop/product-card.tsx`**

- Props thêm `shop?: { type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT'; condition: string | null; summary: VariantSummary }`.
- Tính:

```ts
const summary = shop?.summary;
const needsDetail = Boolean(shop && (shop.type !== 'DOWNLOAD' || summary?.hasMultiple));
const priceVnd = summary ? summary.minPriceVnd : product.priceVnd;
const compareAtVnd = summary ? summary.compareAtVnd : product.compareAtVnd;
const showFrom = Boolean(summary && summary.minPriceVnd !== summary.maxPriceVnd);
const soldOut = Boolean(summary?.soldOut);
```

và thay các chỗ `product.priceVnd`/`product.compareAtVnd` trong phần giá + `discountPercent` bằng `priceVnd`/`compareAtVnd`; giá hiển thị thêm tiền tố `{showFrom && 'Từ '}`.

- Badge góc trên (cạnh badge version): nếu `shop` thì **ẩn** badge `v{version}`; nếu `shop?.condition` hiện `<Badge variant="secondary" className="text-xs shadow-xs">{conditionLabel(shop.condition)}</Badge>`; nếu `soldOut` hiện `<Badge variant="destructive" className="text-xs shadow-xs">Hết hàng</Badge>`.
- Nút mua (nhánh `mode === 'PAID'`): nếu `soldOut` → `<Button disabled className="w-full text-xs">Hết hàng</Button>`; nếu `needsDetail` → `<Link href={`/${catalog}/${product.slug}`} className={buttonStyles({ className: 'w-full text-xs font-semibold' })}>Chọn mua</Link>`; còn lại giữ nút thêm giỏ hiện tại.
- `ProductCover` truyền thêm `version={shop ? undefined : product.version}`.

- [ ] **Step 7: Kiểm tra**

Run: `pnpm typecheck && pnpm lint && pnpm test` → PASS.
Thủ công: `/shop` hiện tab; `/shop?c=do-cong-nghe&cond=da-dung` lọc đúng; `/shop?c=xyz` hiện tất cả, không lỗi; áo 4 biến thể hiện "Từ 150.000 đ" (nếu giá khác nhau) và nút "Chọn mua"; đặt mọi biến thể stock 0 → "Hết hàng". `/source-code` và trang chủ không đổi.

- [ ] **Step 8: Commit**

```bash
git add src/lib/shop/filters.ts src/app/shop/page.tsx src/components/shop/product-card.tsx tests/unit/shop-filters.test.ts
git commit -m "feat(shop): lọc danh mục/tình trạng và thẻ sản phẩm theo biến thể"
```

---

### Task 8: Trang chi tiết — gallery, chọn biến thể, tình trạng, bảo hành

**Files:**

- Create: `src/components/shop/product-gallery.tsx`, `src/components/shop/variant-purchase-panel.tsx`
- Modify: `src/components/shop/product-detail-page.tsx`, `src/components/shop/add-to-cart-button.tsx`

**Interfaces:**

- Consumes: `pickDefaultVariant`, `PURCHASABLE_TYPES`, `VariantSnapshot` (Task 2), `conditionLabel` (Task 6), `ProductCover` (có sẵn).
- Produces:
  - `AddToCartButton` props `{ productId: string; variantId?: string; disabled?: boolean; disabledLabel?: string }`
  - `ProductGallery` props `{ name: string; slug: string; kind: 'SOURCE_CODE' | 'SHOP'; coverUrl: string; gallery: string[] }`
  - `VariantPurchasePanel` props `{ productId: string; type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT'; variants: VariantSnapshot[] }`

- [ ] **Step 1: `add-to-cart-button.tsx`** — thêm props `variantId?`, `disabled?`, `disabledLabel?`; `addItem(productId, 1, variantId)` ở cả 2 handler; khi `disabled` render một `<Button size="lg" disabled className="h-12 w-full text-sm font-semibold">{disabledLabel ?? 'Tạm hết hàng'}</Button>` thay cho 2 nút.

- [ ] **Step 2: Tạo `product-gallery.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ProductCover } from '@/components/shop/product-cover';

export function ProductGallery({
  name,
  slug,
  kind,
  coverUrl,
  gallery,
  version,
}: {
  name: string;
  slug: string;
  kind: 'SOURCE_CODE' | 'SHOP';
  coverUrl: string;
  gallery: string[];
  version?: string;
}) {
  const images = [...new Set([coverUrl, ...gallery].filter(Boolean))];
  const [active, setActive] = useState(images[0] ?? '');

  return (
    <div className="space-y-3">
      <ProductCover
        name={name}
        slug={slug}
        coverUrl={active}
        kind={kind}
        version={version}
        className="border-border rounded-xl border"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(url)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                url === active
                  ? 'border-primary'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label="Xem ảnh"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-16 object-cover sm:size-20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Tạo `variant-purchase-panel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AddToCartButton } from '@/components/shop/add-to-cart-button';
import {
  pickDefaultVariant,
  PURCHASABLE_TYPES,
  type ProductTypeValue,
  type VariantSnapshot,
} from '@/lib/shop/variants';

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
const inStock = (variant: VariantSnapshot) => variant.stock === null || variant.stock > 0;

export function VariantPurchasePanel({
  productId,
  type,
  variants,
}: {
  productId: string;
  type: ProductTypeValue;
  variants: VariantSnapshot[];
}) {
  const active = variants.filter((variant) => variant.active);
  const initial = active.find(inStock) ?? pickDefaultVariant(variants);
  const [selectedId, setSelectedId] = useState(initial?.id ?? '');
  const selected = active.find((variant) => variant.id === selectedId) ?? initial;

  if (!selected) {
    return <p className="text-muted-foreground text-sm">Sản phẩm tạm ngừng bán.</p>;
  }

  const purchasable = PURCHASABLE_TYPES.includes(type);
  const discount =
    selected.compareAtVnd && selected.compareAtVnd > selected.priceVnd
      ? Math.round(((selected.compareAtVnd - selected.priceVnd) / selected.compareAtVnd) * 100)
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-foreground text-3xl font-extrabold">
          {formatVnd(selected.priceVnd)}
        </span>
        {discount && (
          <>
            <span className="text-muted-foreground text-base line-through">
              {formatVnd(selected.compareAtVnd!)}
            </span>
            <Badge variant="destructive" className="text-xs font-bold">
              -{discount}%
            </Badge>
          </>
        )}
      </div>

      {active.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Lựa chọn: <span className="text-muted-foreground">{selected.name}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {active.map((variant) => (
              <button
                key={variant.id}
                type="button"
                disabled={!inStock(variant)}
                onClick={() => setSelectedId(variant.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                  variant.id === selected.id
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {variant.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.stock !== null && (
        <p className="text-muted-foreground text-xs">
          {selected.stock > 0 ? `Còn ${selected.stock} sản phẩm` : 'Tạm hết hàng'}
        </p>
      )}

      <AddToCartButton
        productId={productId}
        variantId={selected.id}
        disabled={!purchasable || !inStock(selected)}
        disabledLabel={purchasable ? 'Tạm hết hàng' : 'Sắp mở bán'}
      />
    </div>
  );
}
```

- [ ] **Step 4: Sửa `product-detail-page.tsx`**

- Query: `include: { files: true, variants: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } }`.
- Tính `const isShopGoods = product.kind === 'SHOP' && product.type !== 'DOWNLOAD';` và `const variants = product.variants.map(({ id, name, priceVnd, compareAtVnd, stock, sortOrder, active }) => ({ id, name, priceVnd, compareAtVnd, stock, sortOrder, active }));`
- Thay `<ProductCover … />` đã thêm trước đó bằng `<ProductGallery name={product.name} slug={product.slug} kind={product.kind} coverUrl={product.coverUrl} gallery={product.gallery} version={isShopGoods ? undefined : product.version} />`.
- Badge "Phiên bản …" chỉ hiện khi `!isShopGoods`; khi `isShopGoods` hiện badge danh mục `categoryLabel(product.category)` và badge `conditionLabel(product.condition)` (nếu có).
- Khối "Gói tài liệu đính kèm" chỉ hiện khi `!isShopGoods`.
- Sau khối mô tả, khi `isShopGoods` và có `product.conditionNote` hoặc `product.warrantyNote`, thêm:

```tsx
<div className="border-border bg-card grid gap-4 rounded-xl border p-6 sm:grid-cols-2">
  {product.conditionNote && (
    <div>
      <h3 className="text-sm font-semibold">Tình trạng: {conditionLabel(product.condition)}</h3>
      <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
        {product.conditionNote}
      </p>
    </div>
  )}
  {product.warrantyNote && (
    <div>
      <h3 className="text-sm font-semibold">Bảo hành</h3>
      <p className="text-muted-foreground mt-1 text-sm">{product.warrantyNote}</p>
    </div>
  )}
</div>
```

- Card mua (cột phải): khi `isShopGoods`, thay toàn bộ phần giá + nút bằng `<VariantPurchasePanel productId={product.id} type={product.type} variants={variants} />`; danh sách cam kết đổi thành: đồ vật lý → "Phí ship tính theo tỉnh khi thanh toán", "Kiểm tra hàng khi nhận"; tài khoản → deliveryMode `AUTO` "Nhận thông tin tài khoản qua email ngay sau thanh toán", `MANUAL` "Bàn giao thủ công trong giờ làm việc"; cả hai có dòng bảo hành nếu có `warrantyNote`. Tiêu đề "Giá sở hữu vĩnh viễn" chỉ hiện khi `!isShopGoods`.
- Hàng `DOWNLOAD` trả phí: `<AddToCartButton productId={product.id} variantId={pickDefaultVariant(variants)?.id} />`.

- [ ] **Step 5: Kiểm tra**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → PASS.
Thủ công:

1. Mở áo đã tạo ở Task 6 (đăng): chọn "Trắng / M" → giá đổi; biến thể stock 0 bị gạch, không bấm được; nút hiện "Sắp mở bán" (disabled).
2. Đồ công nghệ cũ → thấy badge "Đã dùng", khối Tình trạng + Bảo hành.
3. Gallery 3 ảnh → bấm thumbnail đổi ảnh chính.
4. Sản phẩm Shop dạng file trả phí → "Thêm vào giỏ" hoạt động, giỏ hiện đúng giá, checkout tạo đơn.
5. `/source-code/<slug>` hiển thị như cũ.
6. Kiểm tra mobile (DevTools 375px): nút biến thể xuống dòng, không tràn ngang.

- [ ] **Step 6: Commit**

```bash
git add src/components/shop/product-gallery.tsx src/components/shop/variant-purchase-panel.tsx src/components/shop/product-detail-page.tsx src/components/shop/add-to-cart-button.tsx
git commit -m "feat(shop): trang chi tiết có gallery, chọn biến thể, tình trạng và bảo hành"
```

---

## Self-Review (đã chạy)

- **Spec coverage (giai đoạn 1):** 3.1 enum (Task 1; `PaymentMethod`/`FulfillmentStatus`/`AccountStockStatus` thuộc GĐ2–3), 3.2 cột Product (Task 1, 5), 3.3 ProductVariant (Task 1, 5), 3.7 `variantId`/`variantNameSnapshot`/`productTypeSnapshot` (Task 1, 4; `deliveredCredentials` thuộc GĐ3), 5.1 (Task 7), 5.2 (Task 8), 5.3 (Task 3, 4), 6.1 (Task 5, 6), 8 migration + backfill (Task 1; seed ShippingZone thuộc GĐ2), 10 GĐ1 "Sắp mở bán" (Task 2 `PURCHASABLE_TYPES`, Task 8).
- **Giới hạn số lượng tài khoản 5/dòng** (spec 5.2) chuyển sang GĐ3 cùng lúc mở bán tài khoản.
- **Placeholder:** không có TBD/TODO; mọi bước code có code.
- **Nhất quán kiểu:** `VariantSnapshot`, `ProductForCart`, `lineKey`, `VariantInput`, `VariantTableDefault` dùng cùng tên giữa các task; field form `type|category|condition|conditionNote|warrantyNote|deliveryMode|gallery|variants` khớp giữa Task 5 và Task 6.
- **Review Focus:** 5 mục đều có test ở task sở hữu (Task 2, 3, 5, 7).
