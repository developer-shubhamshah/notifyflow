
-- Create account role enum
CREATE TYPE "AccountRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Create Account table
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- Create AccountUser table
CREATE TABLE "AccountUser" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountUser_pkey" PRIMARY KEY ("id")
);

-- Create one account for every existing user.
-- Using the existing user ID as the account ID gives us a
-- deterministic mapping for the initial account.
INSERT INTO "Account" ("id", "name", "updatedAt")
SELECT
    "id",
    "name" || '''s NotifyFlow Account',
    CURRENT_TIMESTAMP
FROM "User";

-- Assign each existing user as the OWNER of their account.
INSERT INTO "AccountUser" ("id", "accountId", "userId", "role")
SELECT
    gen_random_uuid()::text,
    "id",
    "id",
    'OWNER'::"AccountRole"
FROM "User";

-- Add Brand.accountId as nullable initially.
ALTER TABLE "Brand" ADD COLUMN "accountId" TEXT;

-- Assign existing brands to their owners' accounts.
UPDATE "Brand"
SET "accountId" = "ownerId";

-- Make accountId mandatory after backfilling.
ALTER TABLE "Brand"
ALTER COLUMN "accountId" SET NOT NULL;

-- Replace the old uniqueness constraint.
DROP INDEX "Brand_ownerId_slug_key";

CREATE UNIQUE INDEX "Brand_accountId_slug_key"
ON "Brand"("accountId", "slug");

CREATE INDEX "Brand_accountId_idx"
ON "Brand"("accountId");

CREATE INDEX "AccountUser_userId_idx"
ON "AccountUser"("userId");

CREATE UNIQUE INDEX "AccountUser_accountId_userId_key"
ON "AccountUser"("accountId", "userId");

-- Foreign keys
ALTER TABLE "Brand"
ADD CONSTRAINT "Brand_accountId_fkey"
FOREIGN KEY ("accountId")
REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountUser"
ADD CONSTRAINT "AccountUser_accountId_fkey"
FOREIGN KEY ("accountId")
REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountUser"
ADD CONSTRAINT "AccountUser_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
