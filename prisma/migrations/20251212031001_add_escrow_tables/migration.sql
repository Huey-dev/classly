-- CreateEnum
CREATE TYPE "NftPolicyMode" AS ENUM ('PLATFORM_MANAGED', 'CREATOR_MANAGED');

-- CreateEnum
CREATE TYPE "NftClaimStatus" AS ENUM ('LOCKED', 'PAYMENT_PENDING', 'PAID', 'MINTING', 'MINTED', 'FAILED');

-- CreateTable
CREATE TABLE "CourseNftConfig" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "fineLovelace" BIGINT NOT NULL DEFAULT 0,
    "eligibilityRule" TEXT NOT NULL DEFAULT 'WATCH_100',
    "metadataTemplate" JSONB,
    "imageUrl" TEXT,
    "policyMode" "NftPolicyMode" NOT NULL DEFAULT 'PLATFORM_MANAGED',
    "policyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseNftConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NftMintClaim" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "status" "NftClaimStatus" NOT NULL DEFAULT 'LOCKED',
    "fineLovelace" BIGINT NOT NULL DEFAULT 0,
    "estimatedFeeLovelace" BIGINT NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "policyId" TEXT,
    "assetName" TEXT,
    "assetId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NftMintClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseNftConfig_courseId_key" ON "CourseNftConfig"("courseId");

-- CreateIndex
CREATE INDEX "NftMintClaim_courseId_idx" ON "NftMintClaim"("courseId");

-- CreateIndex
CREATE INDEX "NftMintClaim_userId_idx" ON "NftMintClaim"("userId");

-- CreateIndex
CREATE INDEX "NftMintClaim_status_idx" ON "NftMintClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NftMintClaim_courseId_userId_idempotencyKey_key" ON "NftMintClaim"("courseId", "userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "CourseNftConfig" ADD CONSTRAINT "CourseNftConfig_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NftMintClaim" ADD CONSTRAINT "NftMintClaim_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NftMintClaim" ADD CONSTRAINT "NftMintClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
