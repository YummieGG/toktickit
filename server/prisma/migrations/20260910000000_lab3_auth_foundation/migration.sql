-- Lab 3-2 authentication foundation.
-- This migration intentionally preserves the Lab 2 table, ids, sequences and rows.

DO $$
BEGIN
  IF to_regclass('public."User"') IS NULL
     AND to_regclass('public."RequesterUser"') IS NOT NULL THEN
    ALTER TABLE "RequesterUser" RENAME TO "User";
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public."RequesterUser_pkey"') IS NOT NULL
     AND to_regclass('public."User_pkey"') IS NULL THEN
    ALTER INDEX "RequesterUser_pkey" RENAME TO "User_pkey";
  END IF;
  IF to_regclass('public."RequesterUser_email_key"') IS NOT NULL
     AND to_regclass('public."User_email_key"') IS NULL THEN
    ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
  END IF;
END
$$;

-- Canonicalization is deliberately before any new lookup index is created.
UPDATE "User"
SET "email" = lower(btrim("email"))
WHERE "email" <> lower(btrim("email"));

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'REQUESTER';

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- The old foreign key follows a table rename in PostgreSQL, but recreating it
-- makes the final target explicit and keeps a manually re-run migration safe.
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Ticket_requesterId_fkey'
      AND conrelid = '"Ticket"'::regclass
  ) THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" SERIAL NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" SERIAL NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "cooldownUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LoginAttempt_normalizedEmail_ipHash_key"
  ON "LoginAttempt"("normalizedEmail", "ipHash");
CREATE INDEX IF NOT EXISTS "LoginAttempt_cooldownUntil_idx" ON "LoginAttempt"("cooldownUntil");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserSession_userId_fkey'
      AND conrelid = '"UserSession"'::regclass
  ) THEN
    ALTER TABLE "UserSession"
      ADD CONSTRAINT "UserSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
