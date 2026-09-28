-- AlterTable
ALTER TABLE "SystemAnnouncement" ADD COLUMN IF NOT EXISTS "proOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemAnnouncement_isActive_proOnly_idx" ON "SystemAnnouncement"("isActive", "proOnly");
