-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ALTER COLUMN "content" SET DEFAULT '';
