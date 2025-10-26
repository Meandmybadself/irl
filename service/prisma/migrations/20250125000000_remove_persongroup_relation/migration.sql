-- Migration: Remove relation field from PersonGroup
-- Simplify PersonGroup to only track admin status without role/relation distinction

-- Remove the relation column from person_groups table
ALTER TABLE "person_groups" DROP COLUMN IF EXISTS "relation";
