/*
  Warnings:

  - A unique constraint covering the columns `[muxUploadId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_classroomId_fkey";

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "muxUploadId" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PROCESSING',
ALTER COLUMN "classroomId" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "muxPlaybackId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Content_muxUploadId_key" ON "Content"("muxUploadId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
