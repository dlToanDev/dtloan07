-- Lộ trình khóa học: số bài dự kiến và trạng thái đã soạn xong (chỉ thêm cột).
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "contentCompletedAt" TIMESTAMP(3),
ADD COLUMN     "plannedLessons" INTEGER;

