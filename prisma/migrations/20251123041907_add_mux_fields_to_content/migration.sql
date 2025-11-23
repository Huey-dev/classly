/*
  Warnings:

  - A unique constraint covering the columns `[muxAssetId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[muxPlaybackId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "muxAssetId" TEXT NOT NULL DEFAULT 'TEMP_ASSET_ID',
ADD COLUMN     "muxPlaybackId" TEXT NOT NULL DEFAULT 'TEMP_PLAYBACK_ID',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Content_muxAssetId_key" ON "Content"("muxAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Content_muxPlaybackId_key" ON "Content"("muxPlaybackId");

-- CreateIndex
CREATE INDEX "Content_classroomId_idx" ON "Content"("classroomId");

-- CreateIndex
CREATE INDEX "Content_userId_idx" ON "Content"("userId");
