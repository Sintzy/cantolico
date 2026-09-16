-- Keep the legacy email-based MassMember relation canonical and unique.
-- Existing duplicate invitations that only differ in case/whitespace are
-- collapsed in favour of an accepted membership, then the newest invitation.
BEGIN;

WITH ranked_members AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY "massId", lower(btrim("userEmail"))
      ORDER BY
        ("status" = 'ACCEPTED') DESC,
        "invitedAt" DESC NULLS LAST,
        "createdAt" DESC NULLS LAST,
        id DESC
    ) AS row_number
  FROM "MassMember"
)
DELETE FROM "MassMember" member
USING ranked_members ranked
WHERE member.id = ranked.id
  AND ranked.row_number > 1;

UPDATE "MassMember"
SET "userEmail" = lower(btrim("userEmail"))
WHERE "userEmail" IS DISTINCT FROM lower(btrim("userEmail"));

ALTER TABLE "MassMember"
  ADD CONSTRAINT "MassMember_userEmail_canonical"
  CHECK ("userEmail" = lower(btrim("userEmail")));

CREATE UNIQUE INDEX IF NOT EXISTS "MassMember_massId_canonical_email_key"
  ON "MassMember" ("massId", lower(btrim("userEmail")));

COMMIT;
