-- Đồng bộ các bảng đã có trong schema.prisma nhưng chưa từng có migration
-- (Affiliate, Course, User.password). Viết idempotent để database production
-- đang chạy — nơi các bảng này được tạo bằng `prisma db push` — vẫn apply được.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AffiliateCategory" AS ENUM ('CLOUD', 'DOMAIN', 'DEVOPS', 'DEVTOOLS', 'SECURITY', 'SHOPPING', 'SHOPEE', 'TIKTOK', 'TOOLCODE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AffiliateLinkType" AS ENUM ('DIRECT', 'SHORTENED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UPCOMING', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliateItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AffiliateCategory" NOT NULL DEFAULT 'OTHER',
    "platform" TEXT,
    "description" TEXT NOT NULL,
    "perks" TEXT,
    "couponCode" TEXT,
    "directUrl" TEXT NOT NULL,
    "shortenedUrl" TEXT,
    "activeUrlType" "AffiliateLinkType" NOT NULL DEFAULT 'DIRECT',
    "logoUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceVnd" INTEGER NOT NULL DEFAULT 0,
    "compareAtVnd" INTEGER,
    "coverUrl" TEXT,
    "level" TEXT NOT NULL DEFAULT 'Cơ bản đến Nâng cao',
    "duration" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "learnUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateItem_slug_key" ON "AffiliateItem"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliateItem_category_active_idx" ON "AffiliateItem"("category", "active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliateItem_featured_active_idx" ON "AffiliateItem"("featured", "active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Course_status_idx" ON "Course"("status");
