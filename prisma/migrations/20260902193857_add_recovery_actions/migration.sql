-- CreateEnum
CREATE TYPE "RecoveryActionType" AS ENUM ('RETRY_PAYMENT_LINK');

-- CreateEnum
CREATE TYPE "RecoveryActionStatus" AS ENUM ('PENDING', 'EXECUTED', 'FAILED');

-- CreateTable
CREATE TABLE "RecoveryAction" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "actionType" "RecoveryActionType" NOT NULL,
    "status" "RecoveryActionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RecoveryAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecoveryAction_recoveryCaseId_idx" ON "RecoveryAction"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "RecoveryAction_actionType_idx" ON "RecoveryAction"("actionType");

-- CreateIndex
CREATE INDEX "RecoveryAction_status_idx" ON "RecoveryAction"("status");

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
