/*
  Warnings:

  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Content` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Review";

-- CreateTable
CREATE TABLE "ClassroomReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaMetadata" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "format" TEXT NOT NULL,

    CONSTRAINT "MediaMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomReview_userId_classroomId_key" ON "ClassroomReview"("userId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReview_userId_contentId_key" ON "ContentReview"("userId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaMetadata_contentId_key" ON "MediaMetadata"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomLike_userId_classroomId_key" ON "ClassroomLike"("userId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentLike_userId_contentId_key" ON "ContentLike"("userId", "contentId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomReview" ADD CONSTRAINT "ClassroomReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomReview" ADD CONSTRAINT "ClassroomReview_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaMetadata" ADD CONSTRAINT "MediaMetadata_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomLike" ADD CONSTRAINT "ClassroomLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomLike" ADD CONSTRAINT "ClassroomLike_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
