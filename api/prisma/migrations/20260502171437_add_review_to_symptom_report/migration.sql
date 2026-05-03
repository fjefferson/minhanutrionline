-- AlterTable
ALTER TABLE "SymptomReport" ADD COLUMN     "helpful" BOOLEAN,
ADD COLUMN     "reviewRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3);
