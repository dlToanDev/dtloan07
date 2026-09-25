-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYOS', 'COD');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAYOS',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "shipAddress" TEXT,
ADD COLUMN     "shipNote" TEXT,
ADD COLUMN     "shipProvince" TEXT,
ADD COLUMN     "shippingFeeVnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackingCode" TEXT;

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feeVnd" INTEGER NOT NULL,
    "freeShipFromVnd" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingZone_sortOrder_idx" ON "ShippingZone"("sortOrder");

-- Seed 3 khu vực ship mặc định. Admin tự sửa phí và ngưỡng freeship sau.
INSERT INTO "ShippingZone" ("id", "name", "provinces", "feeVnd", "freeShipFromVnd", "isDefault", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('zone_noi_thanh', 'Nội thành', ARRAY['ha-noi', 'ho-chi-minh']::TEXT[], 20000, NULL, false, 0, NOW(), NOW()),
  ('zone_lan_can', 'Lân cận', ARRAY['bac-ninh', 'hung-yen', 'hai-phong', 'dong-nai', 'tay-ninh']::TEXT[], 30000, NULL, false, 1, NOW(), NOW()),
  ('zone_toan_quoc', 'Toàn quốc (mặc định)', ARRAY[]::TEXT[], 40000, NULL, true, 99, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
