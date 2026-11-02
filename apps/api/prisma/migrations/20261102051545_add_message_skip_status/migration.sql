-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'SKIPPED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "skipReason" TEXT;
