-- CreateTable
CREATE TABLE "AgendaBlock" (
    "id" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaBlock_pkey" PRIMARY KEY ("id")
);
