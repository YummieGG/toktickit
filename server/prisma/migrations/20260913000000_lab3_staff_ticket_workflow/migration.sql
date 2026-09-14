-- Issue #41: staff queue, ticket workflow, and internal notes.
-- Existing Ticket rows remain NEW; the enum additions are additive and safe to rerun.
DO $$
BEGIN
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
END $$;

CREATE TABLE IF NOT EXISTS "InternalNote" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "InternalNote_authorId_idx" ON "InternalNote"("authorId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalNote_ticketId_fkey') THEN
    ALTER TABLE "InternalNote"
      ADD CONSTRAINT "InternalNote_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalNote_authorId_fkey') THEN
    ALTER TABLE "InternalNote"
      ADD CONSTRAINT "InternalNote_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Ticket_requestedPriority_idx" ON "Ticket"("requestedPriority");
CREATE INDEX IF NOT EXISTS "Ticket_itPriority_idx" ON "Ticket"("itPriority");
CREATE INDEX IF NOT EXISTS "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");
