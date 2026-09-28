-- Video bài học tự upload lên R2 (chỉ thêm cột, không đổi dữ liệu).
-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "videoKey" TEXT,
ADD COLUMN     "videoName" TEXT,
ADD COLUMN     "videoSize" BIGINT;

