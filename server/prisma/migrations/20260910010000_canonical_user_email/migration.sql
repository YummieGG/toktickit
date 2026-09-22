-- Corrective migration for databases that already applied
-- 20260910000000_lab3_auth_foundation. It establishes the canonical-email
-- invariant without rewriting the historical migration/checksum.

DO $$
BEGIN
  IF to_regclass('public."User"') IS NULL THEN
    RAISE EXCEPTION 'Cannot establish canonical User.email invariant: User table is missing';
  END IF;

  IF EXISTS (
    SELECT lower(btrim("email"))
    FROM "User"
    GROUP BY lower(btrim("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Cannot canonicalize User.email because legacy canonical collisions exist';
  END IF;
END
$$;

UPDATE "User"
SET "email" = lower(btrim("email"))
WHERE "email" <> lower(btrim("email"));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_email_canonical_check'
      AND conrelid = '"User"'::regclass
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_email_canonical_check"
      CHECK ("email" = lower(btrim("email")));
  END IF;
END
$$;
