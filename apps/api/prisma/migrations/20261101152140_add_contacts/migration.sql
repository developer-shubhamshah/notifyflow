-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "whatsappConsent" BOOLEAN NOT NULL DEFAULT false,
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "emailConsent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappConsentAt" TIMESTAMP(3),
    "smsConsentAt" TIMESTAMP(3),
    "emailConsentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_brandId_idx" ON "Contact"("brandId");

-- CreateIndex
CREATE INDEX "Contact_brandId_email_idx" ON "Contact"("brandId", "email");

-- CreateIndex
CREATE INDEX "Contact_brandId_isActive_idx" ON "Contact"("brandId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_brandId_mobile_key" ON "Contact"("brandId", "mobile");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
