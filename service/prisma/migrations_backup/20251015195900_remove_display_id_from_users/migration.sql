-- Remove the obsolete displayId column from users
DROP INDEX IF EXISTS "users_displayId_key";

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "displayId";
