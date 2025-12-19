-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "courseIdHash" TEXT;

-- CreateIndex
CREATE INDEX "Escrow_courseIdHash_idx" ON "Escrow"("courseIdHash");
