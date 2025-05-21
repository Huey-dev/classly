-- AlterTable
ALTER TABLE "User" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token");

-- DropIndex
DROP INDEX "VerificationToken_identifier_token_key";
