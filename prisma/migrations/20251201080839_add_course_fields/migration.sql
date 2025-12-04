-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "courseTitle" TEXT,
ADD COLUMN     "partNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Content_courseId_idx" ON "Content"("courseId");
