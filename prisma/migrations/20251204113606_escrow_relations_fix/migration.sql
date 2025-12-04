/*
  Warnings:

  - You are about to drop the column `courseTitle` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the `ClassroomLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassroomReview` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[courseId,partNumber]` on the table `Content` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CourseVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'UNLISTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CertificateTargetType" AS ENUM ('COURSE', 'CONTENT', 'USER', 'GENERIC');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "ClassroomLike" DROP CONSTRAINT "ClassroomLike_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "ClassroomLike" DROP CONSTRAINT "ClassroomLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "ClassroomReview" DROP CONSTRAINT "ClassroomReview_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "ClassroomReview" DROP CONSTRAINT "ClassroomReview_userId_fkey";

-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_userId_fkey";

-- DropForeignKey
ALTER TABLE "ContentLike" DROP CONSTRAINT "ContentLike_contentId_fkey";

-- DropForeignKey
ALTER TABLE "ContentLike" DROP CONSTRAINT "ContentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "ContentReview" DROP CONSTRAINT "ContentReview_contentId_fkey";

-- DropForeignKey
ALTER TABLE "ContentReview" DROP CONSTRAINT "ContentReview_userId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_userId_fkey";

-- DropForeignKey
ALTER TABLE "MediaMetadata" DROP CONSTRAINT "MediaMetadata_contentId_fkey";

-- DropIndex
DROP INDEX "Classroom_name_userId_key";

-- DropIndex
DROP INDEX "Content_classroomId_idx";

-- DropIndex
DROP INDEX "Follow_followerId_idx";

-- DropIndex
DROP INDEX "Follow_followingId_idx";

-- AlterTable
ALTER TABLE "Classroom" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "slug" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "courseTitle",
ADD COLUMN     "accessLevel" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "courseId" TEXT,
ALTER COLUMN "classroomId" DROP NOT NULL;

-- DropTable
DROP TABLE "ClassroomLike";

-- DropTable
DROP TABLE "ClassroomReview";

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "language" TEXT,
    "slug" TEXT NOT NULL,
    "priceAda" DECIMAL(65,30),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "CourseVisibility" NOT NULL DEFAULT 'DRAFT',
    "totalDuration" INTEGER,
    "totalParts" INTEGER,
    "averageRating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "enrollmentCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateNFT" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "metadataCid" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "targetType" "CertificateTargetType" NOT NULL,
    "courseId" TEXT,
    "contentId" TEXT,
    "label" TEXT,
    "credibilityScore" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "CertificateNFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "adaAmount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_userId_idx" ON "Course"("userId");

-- CreateIndex
CREATE INDEX "UserRating_ratedId_idx" ON "UserRating"("ratedId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_raterId_ratedId_key" ON "UserRating"("raterId", "ratedId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateNFT_tokenId_key" ON "CertificateNFT"("tokenId");

-- CreateIndex
CREATE INDEX "CertificateNFT_issuerId_idx" ON "CertificateNFT"("issuerId");

-- CreateIndex
CREATE INDEX "CertificateNFT_recipientId_idx" ON "CertificateNFT"("recipientId");

-- CreateIndex
CREATE INDEX "CertificateNFT_courseId_idx" ON "CertificateNFT"("courseId");

-- CreateIndex
CREATE INDEX "CertificateNFT_contentId_idx" ON "CertificateNFT"("contentId");

-- CreateIndex
CREATE INDEX "Escrow_courseId_idx" ON "Escrow"("courseId");

-- CreateIndex
CREATE INDEX "Escrow_teacherId_idx" ON "Escrow"("teacherId");

-- CreateIndex
CREATE INDEX "Escrow_studentId_idx" ON "Escrow"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Content_courseId_partNumber_key" ON "Content"("courseId", "partNumber");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_ratedId_fkey" FOREIGN KEY ("ratedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateNFT" ADD CONSTRAINT "CertificateNFT_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateNFT" ADD CONSTRAINT "CertificateNFT_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateNFT" ADD CONSTRAINT "CertificateNFT_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateNFT" ADD CONSTRAINT "CertificateNFT_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaMetadata" ADD CONSTRAINT "MediaMetadata_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
