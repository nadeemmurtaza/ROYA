-- ROYA: the commission tracker. Three new tables and three enums; nothing existing is touched.

-- CreateEnum
CREATE TYPE "CommissionStage" AS ENUM ('CONSULTATION', 'DESIGN', 'CORSET', 'FLORALS', 'FITTING');

-- CreateEnum
CREATE TYPE "CommissionAppointmentKind" AS ENUM ('ATELIER', 'HOME', 'VIDEO');

-- CreateEnum
CREATE TYPE "CommissionAppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "stage" "CommissionStage" NOT NULL DEFAULT 'CONSULTATION',
    "promisedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEvent" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "stage" "CommissionStage" NOT NULL,
    "note" TEXT,
    "mediaUrl" TEXT,
    "mediaKind" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionAppointment" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "kind" "CommissionAppointmentKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "CommissionAppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commission_orderId_key" ON "Commission"("orderId");

-- CreateIndex
CREATE INDEX "Commission_userId_createdAt_idx" ON "Commission"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Commission_stage_idx" ON "Commission"("stage");

-- CreateIndex
CREATE INDEX "CommissionEvent_commissionId_createdAt_idx" ON "CommissionEvent"("commissionId", "createdAt");

-- CreateIndex
CREATE INDEX "CommissionAppointment_commissionId_startsAt_idx" ON "CommissionAppointment"("commissionId", "startsAt");

-- CreateIndex
CREATE INDEX "CommissionAppointment_status_startsAt_idx" ON "CommissionAppointment"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "CommissionEvent" ADD CONSTRAINT "CommissionEvent_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAppointment" ADD CONSTRAINT "CommissionAppointment_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
