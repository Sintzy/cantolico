-- CreateEnum
CREATE TYPE "public"."BannerType" AS ENUM ('ANNOUNCEMENT', 'ALERT', 'CHANGELOG', 'WARNING', 'REQUEST', 'INFO', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."BannerPosition" AS ENUM ('TOP', 'BOTTOM');

-- CreateEnum
CREATE TYPE "public"."BannerPage" AS ENUM ('HOME', 'MUSICS', 'ADMIN', 'ALL');

-- CreateTable
CREATE TABLE "public"."Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."BannerType" NOT NULL,
    "position" "public"."BannerPosition" NOT NULL DEFAULT 'TOP',
    "pages" "public"."BannerPage"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Banner" ADD CONSTRAINT "Banner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
