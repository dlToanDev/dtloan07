-- Danh mục Shop chuyển từ enum cố định sang bảng để admin tự thêm / sửa.

CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hasCondition" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");
CREATE INDEX "ProductCategory_sortOrder_idx" ON "ProductCategory"("sortOrder");

-- Giữ nguyên các danh mục cũ (cùng slug để link lọc cũ vẫn chạy).
INSERT INTO "ProductCategory" ("id", "name", "slug", "sortOrder", "hasCondition") VALUES
    ('cat_apparel', 'Quần áo', 'quan-ao', 10, false),
    ('cat_hat', 'Mũ', 'mu', 20, false),
    ('cat_mug', 'Cốc', 'coc', 30, false),
    ('cat_accessory', 'Phụ kiện', 'phu-kien', 40, false),
    ('cat_tech', 'Đồ công nghệ', 'do-cong-nghe', 50, true),
    ('cat_account', 'Tài khoản', 'tai-khoan', 60, false),
    ('cat_other', 'Khác', 'khac', 70, false);

ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
UPDATE "Product" SET "categoryId" = 'cat_' || lower("category"::text) WHERE "category" IS NOT NULL;

DROP INDEX "Product_kind_status_category_idx";
ALTER TABLE "Product" DROP COLUMN "category";
DROP TYPE "ShopCategory";

CREATE INDEX "Product_kind_status_categoryId_idx" ON "Product"("kind", "status", "categoryId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
