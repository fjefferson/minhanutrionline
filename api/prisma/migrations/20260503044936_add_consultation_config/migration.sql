-- CreateTable
CREATE TABLE "ConsultationConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "graceDays" INTEGER NOT NULL DEFAULT 15,
    "gapDays" INTEGER NOT NULL DEFAULT 30,
    "bizHours" INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationConfig_pkey" PRIMARY KEY ("id")
);
