-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('DOWNLOAD', 'PHYSICAL', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('APPAREL', 'HAT', 'MUG', 'ACCESSORY', 'TECH', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'USED');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "Product"
    ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'DOWNLOAD',
    ADD COLUMN "category" "ShopCategory",
    ADD COLUMN "condition" "ItemCondition",
    ADD COLUMN "conditionNote" TEXT,
    ADD COLUMN "warrantyNote" TEXT,
    ADD COLUMN "deliveryMode" "DeliveryMode",
    ADD COLUMN "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "OrderItem"
    ADD COLUMN "variantId" TEXT,
    ADD COLUMN "variantNameSnapshot" TEXT,
    ADD COLUMN "productTypeSnapshot" "ProductType" NOT NULL DEFAULT 'DOWNLOAD';

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceVnd" INTEGER NOT NULL,
    "compareAtVnd" INTEGER,
    "stock" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_active_idx" ON "ProductVariant"("productId", "active");

-- CreateIndex
CREATE INDEX "Product_kind_status_category_idx" ON "Product"("kind", "status", "category");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: mỗi sản phẩm hiện có nhận 1 biến thể "Mặc định" theo giá hiện tại.
INSERT INTO "ProductVariant" ("id", "productId", "name", "priceVnd", "compareAtVnd", "stock", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'var_' || p."id", p."id", 'Mặc định', p."priceVnd", p."compareAtVnd", NULL, 0, true, NOW(), NOW()
FROM "Product" p;

-- Đơn cũ trỏ về biến thể mặc định của sản phẩm.
UPDATE "OrderItem" oi SET "variantId" = 'var_' || oi."productId"
WHERE oi."variantId" IS NULL;

-- Sản phẩm Shop cũ là file tải về.
UPDATE "Product" SET "category" = 'OTHER' WHERE "kind" = 'SHOP' AND "category" IS NULL;

-- Ràng buộc giá cũ chỉ còn áp dụng cho hàng file tải về: với đồ vật lý và tài
-- khoản số, "Product"."priceVnd" chỉ là giá rẻ nhất được đồng bộ từ biến thể
-- (có thể bằng 0 khi sản phẩm còn ở trạng thái nháp).
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sale_price_check";
ALTER TABLE "Product" ADD CONSTRAINT "Product_sale_price_check" CHECK (
    "type" <> 'DOWNLOAD'
    OR ("saleMode" = 'PAID' AND "priceVnd" > 0)
    OR ("saleMode" IN ('FREE', 'CONTACT') AND "priceVnd" = 0)
);
