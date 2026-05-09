-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "scheduledDowngradePlanId" TEXT;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_scheduledDowngradePlanId_fkey" FOREIGN KEY ("scheduledDowngradePlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
