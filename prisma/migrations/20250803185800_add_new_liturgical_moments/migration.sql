-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LiturgicalMoment" ADD VALUE 'ADORACAO';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'ASPERSAO';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'BAPTISMO';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'BENCAO_DAS_ALIANCAS';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'CORDEIRO_DE_DEUS';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'CRISMA';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'INTRODUCAO_DA_PALAVRA';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'LOUVOR';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'PAI_NOSSO';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'REFLEXAO';
ALTER TYPE "LiturgicalMoment" ADD VALUE 'TERCO_MISTERIO';
