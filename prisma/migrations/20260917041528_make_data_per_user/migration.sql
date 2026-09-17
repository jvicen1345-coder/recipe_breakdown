-- Reverses the "shared household" data model from the
-- 20260914183131_shared_data_and_access_requests migration: Recipe, Folder,
-- PantryItem, CookLog, ManualMealLog, and CartOrder all become private to the
-- account that owns them. The opt-in "social" layer (CommunitySubmission,
-- MadeItPost, etc.) already has its own real per-user scoping and is
-- untouched by this migration.
--
-- Existing rows have no per-row owner for most of these tables, so this
-- backfills them to a single fallback account before making the column
-- required, rather than a bare NOT NULL that would fail outright. Recipe and
-- Folder already carried createdByUserId (attribution-only, nullable) and
-- are backfilled from that first, falling back only for the rows that had
-- none.
DO $$
DECLARE
  fallback_user_id TEXT;
BEGIN
  SELECT id INTO fallback_user_id FROM "User" WHERE email = 'jvicen1345@gmail.com';
  IF fallback_user_id IS NULL THEN
    SELECT id INTO fallback_user_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;
  END IF;

  -- Recipe: backfill from the existing attribution field first.
  ALTER TABLE "Recipe" ADD COLUMN "userId" TEXT;
  UPDATE "Recipe" SET "userId" = COALESCE("createdByUserId", fallback_user_id);
  ALTER TABLE "Recipe" DROP CONSTRAINT IF EXISTS "Recipe_createdByUserId_fkey";
  ALTER TABLE "Recipe" DROP COLUMN "createdByUserId";
  ALTER TABLE "Recipe" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
  DROP INDEX IF EXISTS "Recipe_sourceUrl_key";
  CREATE UNIQUE INDEX "Recipe_userId_sourceUrl_key" ON "Recipe"("userId", "sourceUrl");

  -- Folder: same pattern (no existing rows today, but handled generally).
  ALTER TABLE "Folder" ADD COLUMN "userId" TEXT;
  UPDATE "Folder" SET "userId" = COALESCE("createdByUserId", fallback_user_id);
  ALTER TABLE "Folder" DROP CONSTRAINT IF EXISTS "Folder_createdByUserId_fkey";
  ALTER TABLE "Folder" DROP COLUMN "createdByUserId";
  ALTER TABLE "Folder" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

  -- PantryItem, CookLog, CartOrder, ManualMealLog never carried any owner
  -- info at all — every existing row goes to the fallback account.
  ALTER TABLE "PantryItem" ADD COLUMN "userId" TEXT;
  UPDATE "PantryItem" SET "userId" = fallback_user_id;
  ALTER TABLE "PantryItem" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
  DROP INDEX IF EXISTS "PantryItem_name_key";
  CREATE UNIQUE INDEX "PantryItem_userId_name_key" ON "PantryItem"("userId", "name");

  ALTER TABLE "CookLog" ADD COLUMN "userId" TEXT;
  UPDATE "CookLog" SET "userId" = fallback_user_id;
  ALTER TABLE "CookLog" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "CookLog" ADD CONSTRAINT "CookLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

  ALTER TABLE "CartOrder" ADD COLUMN "userId" TEXT;
  UPDATE "CartOrder" SET "userId" = fallback_user_id;
  ALTER TABLE "CartOrder" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "CartOrder" ADD CONSTRAINT "CartOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

  ALTER TABLE "ManualMealLog" ADD COLUMN "userId" TEXT;
  UPDATE "ManualMealLog" SET "userId" = fallback_user_id;
  ALTER TABLE "ManualMealLog" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "ManualMealLog" ADD CONSTRAINT "ManualMealLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
END $$;
