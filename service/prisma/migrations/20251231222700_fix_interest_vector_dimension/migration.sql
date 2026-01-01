-- Fix interest_vector dimension to match actual number of interests
-- The column was created with vector(1000) but only 253 interests exist

-- First, drop the old column
ALTER TABLE "people" DROP COLUMN IF EXISTS "interest_vector";

-- Recreate with correct dimension (253)
-- Note: This should match the current count of non-deleted interests
ALTER TABLE "people" ADD COLUMN "interest_vector" vector(253);
