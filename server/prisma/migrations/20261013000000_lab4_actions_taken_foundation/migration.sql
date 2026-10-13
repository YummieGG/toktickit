-- Issue #57 / Lab 4-2: Actions Taken data model, Ticket version/resolution, and append-only events
-- Safe and additive migration preserving all existing records.

-- CreateEnum ActionStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionStatus') THEN
    CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- CreateEnum ActionEventType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionEventType') THEN
    CREATE TYPE "ActionEventType" AS ENUM ('CREATED', 'EDITED', 'ASSIGNED', 'UNASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- AlterTable Ticket
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable ActionTaken
CREATE TABLE IF NOT EXISTS "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creationKey" TEXT,
    "creationFingerprint" TEXT,
    "seedKey" TEXT,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

-- CreateTable ActionTakenEvent
CREATE TABLE IF NOT EXISTS "ActionTakenEvent" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "type" "ActionEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "ActionTakenEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ActionTaken_seedKey_key" ON "ActionTaken"("seedKey");
CREATE INDEX IF NOT EXISTS "ActionTaken_ticketId_createdAt_id_idx" ON "ActionTaken"("ticketId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "ActionTaken_assigneeId_status_idx" ON "ActionTaken"("assigneeId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ActionTaken_ticketId_performedById_creationKey_key" ON "ActionTaken"("ticketId", "performedById", "creationKey");

-- CreateIndex for ActionTakenEvent
CREATE INDEX IF NOT EXISTS "ActionTakenEvent_actionId_createdAt_id_idx" ON "ActionTakenEvent"("actionId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "ActionTakenEvent_actorId_idx" ON "ActionTakenEvent"("actorId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActionTaken_ticketId_fkey') THEN
    ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActionTaken_performedById_fkey') THEN
    ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActionTaken_assigneeId_fkey') THEN
    ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActionTakenEvent_actionId_fkey') THEN
    ALTER TABLE "ActionTakenEvent" ADD CONSTRAINT "ActionTakenEvent_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActionTakenEvent_actorId_fkey') THEN
    ALTER TABLE "ActionTakenEvent" ADD CONSTRAINT "ActionTakenEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
