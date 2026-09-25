-- CreateEnum
CREATE TYPE "AccountStockStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'DELIVERED', 'REVOKED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredCredentials" TEXT;

-- CreateTable
CREATE TABLE "AccountStock" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "status" "AccountStockStatus" NOT NULL DEFAULT 'AVAILABLE',
    "orderItemId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialAccessLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "accountStockId" TEXT,
    "orderItemId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountStock_variantId_status_idx" ON "AccountStock"("variantId", "status");

-- CreateIndex
CREATE INDEX "AccountStock_orderItemId_idx" ON "AccountStock"("orderItemId");

-- CreateIndex
CREATE INDEX "CredentialAccessLog_createdAt_idx" ON "CredentialAccessLog"("createdAt");

-- CreateIndex
CREATE INDEX "CredentialAccessLog_orderItemId_idx" ON "CredentialAccessLog"("orderItemId");

-- AddForeignKey
ALTER TABLE "AccountStock" ADD CONSTRAINT "AccountStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountStock" ADD CONSTRAINT "AccountStock_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
