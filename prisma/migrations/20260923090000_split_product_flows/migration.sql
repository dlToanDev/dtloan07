-- Tách sản phẩm do chính chủ bán khỏi source code tải về.
CREATE TYPE "ProductKind" AS ENUM ('SOURCE_CODE', 'SHOP');

ALTER TABLE "Product"
ADD COLUMN "kind" "ProductKind" NOT NULL DEFAULT 'SOURCE_CODE';

CREATE INDEX "Product_kind_status_idx" ON "Product"("kind", "status");
