-- AlterTable
ALTER TABLE "BrandProviderConfig" ADD COLUMN     "connectionMessage" TEXT,
ADD COLUMN     "connectionStatus" TEXT,
ADD COLUMN     "lastTestedAt" TIMESTAMP(3);
