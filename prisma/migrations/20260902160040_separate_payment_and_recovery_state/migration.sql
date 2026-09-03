/*
  Warnings:

  - You are about to drop the column `status` on the `RecoveryCase` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNKNOWN', 'FAILED', 'AUTHORIZED', 'CAPTURED');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('AT_RISK', 'ELIGIBLE', 'INTERVENTION_PENDING', 'ACTION_EXECUTED', 'AWAITING_OUTCOME', 'RECOVERED', 'SUPPRESSED', 'ESCALATED', 'EXPIRED');

-- DropIndex
DROP INDEX "RecoveryCase_status_idx";

-- AlterTable
ALTER TABLE "RecoveryCase" DROP COLUMN "status",
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorDescription" TEXT,
ADD COLUMN     "errorReason" TEXT,
ADD COLUMN     "errorSource" TEXT,
ADD COLUMN     "errorStep" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "recoveryStatus" "RecoveryStatus" NOT NULL DEFAULT 'AT_RISK';

-- DropEnum
DROP TYPE "RecoveryCaseStatus";

-- CreateIndex
CREATE INDEX "RecoveryCase_paymentStatus_idx" ON "RecoveryCase"("paymentStatus");

-- CreateIndex
CREATE INDEX "RecoveryCase_recoveryStatus_idx" ON "RecoveryCase"("recoveryStatus");
