-- Lab 3-3 authorization/requester slice.
-- This migration is additive and safe to re-run. Existing ticket, attachment,
-- requester, category, and related-system rows are preserved.

ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "ownerId" INTEGER,
  ADD COLUMN IF NOT EXISTS "itPriority" "RequestedPriority",
  ADD COLUMN IF NOT EXISTS "problemAppearsResolvedAt" TIMESTAMP(3);

-- Existing Lab 2 tickets start with the same operational priority as the
-- requester's priority. Future Staff workflow changes this independently.
UPDATE "Ticket"
SET "itPriority" = "requestedPriority"
WHERE "itPriority" IS NULL;

ALTER TABLE "Ticket"
  ALTER COLUMN "itPriority" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Ticket_ownerId_idx" ON "Ticket"("ownerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Ticket_ownerId_fkey'
      AND conrelid = '"Ticket"'::regclass
  ) THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "PublicComment" (
  "id" SERIAL NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublicComment_ticketId_createdAt_idx"
  ON "PublicComment"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicComment_authorId_idx"
  ON "PublicComment"("authorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PublicComment_ticketId_fkey'
      AND conrelid = '"PublicComment"'::regclass
  ) THEN
    ALTER TABLE "PublicComment"
      ADD CONSTRAINT "PublicComment_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PublicComment_authorId_fkey'
      AND conrelid = '"PublicComment"'::regclass
  ) THEN
    ALTER TABLE "PublicComment"
      ADD CONSTRAINT "PublicComment_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
