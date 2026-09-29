-- AlterTable
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "detailContent" TEXT;
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "voucherCode" TEXT;
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "voucherDiscount" TEXT;
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "voucherExpires" TIMESTAMP(3);
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "gameType" TEXT;
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "gameConfig" TEXT;
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "proOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemAnnouncement_isActive_proOnly_idx" ON "SystemAnnouncement"("isActive", "proOnly");
