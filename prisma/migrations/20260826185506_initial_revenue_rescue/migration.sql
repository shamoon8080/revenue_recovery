-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecoveryCaseStatus" AS ENUM ('AT_RISK', 'PAID');

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "razorpayEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCase" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "paymentLinkId" TEXT,
    "orderId" TEXT,
    "paymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RecoveryCaseStatus" NOT NULL DEFAULT 'AT_RISK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_razorpayEventId_key" ON "WebhookEvent"("razorpayEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCase_referenceId_key" ON "RecoveryCase"("referenceId");

-- CreateIndex
CREATE INDEX "RecoveryCase_paymentLinkId_idx" ON "RecoveryCase"("paymentLinkId");

-- CreateIndex
CREATE INDEX "RecoveryCase_paymentId_idx" ON "RecoveryCase"("paymentId");

-- CreateIndex
CREATE INDEX "RecoveryCase_status_idx" ON "RecoveryCase"("status");
