-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "interests" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_interests" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "interestId" INTEGER NOT NULL,
    "level" DECIMAL(3,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interests_category_idx" ON "interests"("category");

-- CreateIndex
CREATE INDEX "interests_deleted_idx" ON "interests"("deleted");

-- CreateIndex
CREATE INDEX "person_interests_personId_idx" ON "person_interests"("personId");

-- CreateIndex
CREATE INDEX "person_interests_interestId_idx" ON "person_interests"("interestId");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "person_interests_personId_interestId_key" ON "person_interests"("personId", "interestId");

-- AddForeignKey
ALTER TABLE "person_interests" ADD CONSTRAINT "person_interests_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_interests" ADD CONSTRAINT "person_interests_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add interestVector column to people table (pgvector type)
-- Using a large dimension (1000) to accommodate many interests
-- The actual dimension will be determined by the number of interests
ALTER TABLE "people" ADD COLUMN "interest_vector" vector(1000);

-- Create index for vector similarity search
-- Note: ivfflat index requires dimension, so we use a large fixed dimension
-- The actual vector dimension will match the number of interests
CREATE INDEX "people_interest_vector_idx" ON "people" USING ivfflat ("interest_vector" vector_cosine_ops) WITH (lists = 100);

-- Add constraint to ensure level is between 0 and 1
ALTER TABLE "person_interests" ADD CONSTRAINT "person_interests_level_check" CHECK ("level" >= 0 AND "level" <= 1);

