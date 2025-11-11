-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('EMAIL', 'PHONE', 'ADDRESS', 'URL');

-- CreateEnum
CREATE TYPE "public"."PrivacyLevel" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateTable
CREATE TABLE "public"."contact_information" (
    "id" SERIAL NOT NULL,
    "type" "public"."ContactType" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "privacy" "public"."PrivacyLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "verificationToken" TEXT,
    "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."people" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "pronouns" TEXT,
    "imageURL" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."systems" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."groups" (
    "id" SERIAL NOT NULL,
    "displayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentGroupId" INTEGER,
    "allowsAnyUserToCreateSubgroup" BOOLEAN NOT NULL DEFAULT false,
    "publiclyVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."claims" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "requestingUser" INTEGER NOT NULL,
    "claimCode" TEXT NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_invites" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_contact_information" (
    "id" SERIAL NOT NULL,
    "systemId" INTEGER NOT NULL,
    "contactInformationId" INTEGER NOT NULL,

    CONSTRAINT "system_contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."person_contact_information" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "contactInformationId" INTEGER NOT NULL,

    CONSTRAINT "person_contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_contact_information" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "contactInformationId" INTEGER NOT NULL,

    CONSTRAINT "group_contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."person_groups" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "person_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_change_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "newEmail" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_information_type_idx" ON "public"."contact_information"("type");

-- CreateIndex
CREATE INDEX "contact_information_privacy_idx" ON "public"."contact_information"("privacy");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "people_displayId_key" ON "public"."people"("displayId");

-- CreateIndex
CREATE INDEX "people_userId_idx" ON "public"."people"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_displayId_key" ON "public"."groups"("displayId");

-- CreateIndex
CREATE INDEX "groups_parentGroupId_idx" ON "public"."groups"("parentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimCode_key" ON "public"."claims"("claimCode");

-- CreateIndex
CREATE UNIQUE INDEX "system_contact_information_systemId_contactInformationId_key" ON "public"."system_contact_information"("systemId", "contactInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "person_contact_information_personId_contactInformationId_key" ON "public"."person_contact_information"("personId", "contactInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "group_contact_information_groupId_contactInformationId_key" ON "public"."group_contact_information"("groupId", "contactInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "person_groups_personId_groupId_key" ON "public"."person_groups"("personId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "email_change_requests_verificationToken_key" ON "public"."email_change_requests"("verificationToken");

-- CreateIndex
CREATE INDEX "email_change_requests_userId_idx" ON "public"."email_change_requests"("userId");

-- CreateIndex
CREATE INDEX "email_change_requests_verificationToken_idx" ON "public"."email_change_requests"("verificationToken");

-- AddForeignKey
ALTER TABLE "public"."people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_requestingUser_fkey" FOREIGN KEY ("requestingUser") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_invites" ADD CONSTRAINT "group_invites_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_contact_information" ADD CONSTRAINT "system_contact_information_contactInformationId_fkey" FOREIGN KEY ("contactInformationId") REFERENCES "public"."contact_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_contact_information" ADD CONSTRAINT "system_contact_information_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "public"."systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_contact_information" ADD CONSTRAINT "person_contact_information_contactInformationId_fkey" FOREIGN KEY ("contactInformationId") REFERENCES "public"."contact_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_contact_information" ADD CONSTRAINT "person_contact_information_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_contact_information" ADD CONSTRAINT "group_contact_information_contactInformationId_fkey" FOREIGN KEY ("contactInformationId") REFERENCES "public"."contact_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_contact_information" ADD CONSTRAINT "group_contact_information_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_groups" ADD CONSTRAINT "person_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_groups" ADD CONSTRAINT "person_groups_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_change_requests" ADD CONSTRAINT "email_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
