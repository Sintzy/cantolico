-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'TRUSTED', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PDF', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "SongType" AS ENUM ('ACORDES', 'PARTITURA');

-- CreateEnum
CREATE TYPE "Instrument" AS ENUM ('ORGAO', 'GUITARRA', 'PIANO', 'CORO', 'OUTRO');

-- CreateEnum
CREATE TYPE "LiturgicalMoment" AS ENUM ('ENTRADA', 'ATO_PENITENCIAL', 'GLORIA', 'SALMO', 'ACLAMACAO', 'OFERTORIO', 'SANTO', 'COMUNHAO', 'ACAO_DE_GRACAS', 'FINAL');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "image" TEXT,
    "bio" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "moments" "LiturgicalMoment"[],
    "type" "SongType" NOT NULL,
    "mainInstrument" "Instrument" NOT NULL,
    "tags" TEXT[],
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongVersion" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourcePdfKey" TEXT,
    "sourceText" TEXT,
    "renderedHtml" TEXT,
    "keyOriginal" TEXT,
    "lyricsPlain" TEXT NOT NULL,
    "chordsJson" JSONB,
    "abcBlocks" JSONB,
    "mediaUrl" TEXT,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "SongVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongSubmission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "moment" "LiturgicalMoment"[],
    "type" "SongType" NOT NULL,
    "mainInstrument" "Instrument" NOT NULL,
    "tags" TEXT[],
    "submitterId" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "tempSourceType" "SourceType" NOT NULL,
    "tempPdfKey" TEXT,
    "tempText" TEXT,
    "parsedPreview" JSONB,
    "mediaUrl" TEXT,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" INTEGER,

    CONSTRAINT "SongSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" INTEGER NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","songId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Song_currentVersionId_key" ON "Song"("currentVersionId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "SongVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongVersion" ADD CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongVersion" ADD CONSTRAINT "SongVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongSubmission" ADD CONSTRAINT "SongSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongSubmission" ADD CONSTRAINT "SongSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
