-- CreateEnum
CREATE TYPE "public"."ModerationStatus" AS ENUM ('ACTIVE', 'WARNING', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "public"."ModerationType" AS ENUM ('WARNING', 'SUSPENSION', 'BAN');

-- CreateTable
CREATE TABLE "public"."UserModeration" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "public"."ModerationStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "public"."ModerationType",
    "reason" TEXT,
    "moderatorNote" TEXT,
    "ipAddress" TEXT,
    "moderatedById" INTEGER,
    "moderatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModeration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserModeration_userId_key" ON "public"."UserModeration"("userId");

-- CreateIndex
CREATE INDEX "UserModeration_ipAddress_idx" ON "public"."UserModeration"("ipAddress");

-- CreateIndex
CREATE INDEX "UserModeration_status_idx" ON "public"."UserModeration"("status");

-- AddForeignKey
ALTER TABLE "public"."UserModeration" ADD CONSTRAINT "UserModeration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserModeration" ADD CONSTRAINT "UserModeration_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
