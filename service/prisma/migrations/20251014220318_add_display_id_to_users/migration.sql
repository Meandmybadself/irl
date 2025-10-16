-- Add displayId to users and enforce uniqueness
ALTER TABLE "users" ADD COLUMN "displayId" TEXT NOT NULL;

CREATE UNIQUE INDEX "users_displayId_key" ON "users"("displayId");


