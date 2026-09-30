-- Gộp Source Code vào Shop: source code giờ là loại hàng DOWNLOAD trong Shop.

-- Danh mục riêng cho source code (slug trùng đường dẫn cũ để link /shop?c=source-code dễ nhớ).
INSERT INTO "ProductCategory" ("id", "name", "slug", "sortOrder", "hasCondition")
VALUES ('cat_source_code', 'Source Code', 'source-code', 5, false)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Product"
SET "type" = 'DOWNLOAD',
    "categoryId" = COALESCE(
      "categoryId",
      (SELECT "id" FROM "ProductCategory" WHERE "slug" = 'source-code')
    )
WHERE "kind" = 'SOURCE_CODE';

DROP INDEX "Product_kind_status_idx";
DROP INDEX "Product_kind_status_categoryId_idx";
ALTER TABLE "Product" DROP COLUMN "kind";
DROP TYPE "ProductKind";

CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "Product_status_categoryId_idx" ON "Product"("status", "categoryId");
