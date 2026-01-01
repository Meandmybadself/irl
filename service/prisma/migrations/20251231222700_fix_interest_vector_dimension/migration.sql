-- Fix interest_vector dimension to use max dimension with zero-padding
-- This allows adding/removing interests without schema changes
-- Vector dimension is set to 1000 to accommodate future growth
-- Vectors are padded with zeros to fill unused dimensions

-- First, drop the old column (if it exists with wrong dimension)
ALTER TABLE "people" DROP COLUMN IF EXISTS "interest_vector";

-- Recreate with max dimension (1000)
-- This matches MAX_VECTOR_DIMENSION in vector-helpers.ts
ALTER TABLE "people" ADD COLUMN "interest_vector" vector(1000);
