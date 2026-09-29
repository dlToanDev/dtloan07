-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'WALLET';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "courseId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
