CREATE TYPE "ProductSaleMode" AS ENUM ('FREE', 'CONTACT', 'PAID');
ALTER TABLE "Product" ADD COLUMN "saleMode" "ProductSaleMode" NOT NULL DEFAULT 'PAID';
UPDATE "Product" SET "saleMode" = 'FREE' WHERE "priceVnd" = 0;
ALTER TABLE "ProductFile" ADD COLUMN "filename" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_sale_price_check" CHECK (("saleMode" = 'PAID' AND "priceVnd" > 0) OR ("saleMode" IN ('FREE', 'CONTACT') AND "priceVnd" = 0));
