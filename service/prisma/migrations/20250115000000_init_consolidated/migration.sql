-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE', 'ADDRESS', 'URL');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateTable
CREATE TABLE "contact_information" (
    "id" SERIAL NOT NULL,
    "type" "ContactType" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "privacy" "PrivacyLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
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
CREATE TABLE "people" (
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
CREATE TABLE "systems" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
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
CREATE TABLE "claims" (
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
CREATE TABLE "group_invites" (
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
CREATE TABLE "system_contact_information" (
    "id" SERIAL NOT NULL,
    "systemId" INTEGER NOT NULL,
    "contactInformationId" INTEGER NOT NULL,

    CONSTRAINT "system_contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_contact_information" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "contactInformationId" INTEGER NOT NULL,

    CONSTRAINT "person_contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_contact_information" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "contactInformationId" INTEGER NOT NULL,

    CONSTRAINT "group_contact_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_groups" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "relation" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "person_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "people_displayId_key" ON "people"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_displayId_key" ON "groups"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimCode_key" ON "claims"("claimCode");

-- CreateIndex
CREATE UNIQUE INDEX "system_contact_information_systemId_contactInformationId_key" ON "system_contact_information"("systemId", "contactInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "person_contact_information_personId_contactInformationId_key" ON "person_contact_information"("personId", "contactInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "group_contact_information_groupId_contactInformationId_key" ON "group_contact_information"("groupId", "contactInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "person_groups_personId_groupId_key" ON "person_groups"("personId", "groupId");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_requestingUser_fkey" FOREIGN KEY ("requestingUser") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_contact_information" ADD CONSTRAINT "system_contact_information_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_contact_information" ADD CONSTRAINT "system_contact_information_contactInformationId_fkey" FOREIGN KEY ("contactInformationId") REFERENCES "contact_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_contact_information" ADD CONSTRAINT "person_contact_information_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_contact_information" ADD CONSTRAINT "person_contact_information_contactInformationId_fkey" FOREIGN KEY ("contactInformationId") REFERENCES "contact_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_contact_information" ADD CONSTRAINT "group_contact_information_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_contact_information" ADD CONSTRAINT "group_contact_information_contactInformationId_fkey" FOREIGN KEY ("contactInformationId") REFERENCES "contact_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_groups" ADD CONSTRAINT "person_groups_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_groups" ADD CONSTRAINT "person_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
