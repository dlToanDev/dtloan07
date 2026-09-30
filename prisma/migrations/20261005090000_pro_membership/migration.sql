-- Gói Pro: hạn Pro của tài khoản, đơn mua gói Pro và voucher chỉ dành cho Pro.

-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('PRO_MONTH', 'PRO_YEAR');

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "proOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "membershipPlan" "MembershipPlan";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "proUntil" TIMESTAMP(3);

