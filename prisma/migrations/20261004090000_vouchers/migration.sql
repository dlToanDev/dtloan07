-- Voucher: loại free ship, phạm vi theo danh mục, giới hạn mỗi người, mã riêng và lượt dùng.
-- Coupon cũ giữ nguyên hành vi: áp cho mọi hàng, không giới hạn lượt mỗi người.


-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ALL', 'CATEGORIES');

-- CreateEnum
CREATE TYPE "CouponGrantSource" AS ENUM ('ADMIN', 'SPIN', 'TASK', 'FORM', 'POST');

-- AlterEnum
ALTER TYPE "CouponType" ADD VALUE 'FREE_SHIP';

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "maxDiscountVnd" INTEGER,
ADD COLUMN     "minOrderVnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "perUserLimit" INTEGER,
ADD COLUMN     "scope" "CouponScope" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingDiscountVnd" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CouponGrant" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "CouponGrantSource" NOT NULL DEFAULT 'ADMIN',
    "note" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "grantId" TEXT,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "discountVnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CouponCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CouponCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponGrant_code_key" ON "CouponGrant"("code");

-- CreateIndex
CREATE INDEX "CouponGrant_userId_idx" ON "CouponGrant"("userId");

-- CreateIndex
CREATE INDEX "CouponGrant_couponId_idx" ON "CouponGrant"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_grantId_key" ON "CouponRedemption"("grantId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_userId_idx" ON "CouponRedemption"("couponId", "userId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_email_idx" ON "CouponRedemption"("couponId", "email");

-- CreateIndex
CREATE INDEX "_CouponCategories_B_index" ON "_CouponCategories"("B");

-- AddForeignKey
ALTER TABLE "CouponGrant" ADD CONSTRAINT "CouponGrant_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponGrant" ADD CONSTRAINT "CouponGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CouponGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponCategories" ADD CONSTRAINT "_CouponCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponCategories" ADD CONSTRAINT "_CouponCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

