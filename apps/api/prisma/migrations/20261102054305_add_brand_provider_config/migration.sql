-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "BrandProviderConfig" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'INACTIVE',
    "credentials" JSONB NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT,
    "providerAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandProviderConfig_brandId_status_idx" ON "BrandProviderConfig"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProviderConfig_brandId_channel_key" ON "BrandProviderConfig"("brandId", "channel");

-- AddForeignKey
ALTER TABLE "BrandProviderConfig" ADD CONSTRAINT "BrandProviderConfig_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
