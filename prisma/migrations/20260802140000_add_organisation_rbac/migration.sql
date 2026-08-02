-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_slug_key" ON "organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "membership_userId_key" ON "membership"("userId");

-- CreateIndex
CREATE INDEX "membership_organisationId_idx" ON "membership"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_organisationId_userId_key" ON "membership"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_token_key" ON "invite"("token");

-- CreateIndex
CREATE INDEX "invite_organisationId_email_idx" ON "invite"("organisationId", "email");

-- CreateIndex
CREATE INDEX "audit_log_organisationId_createdAt_idx" ON "audit_log"("organisationId", "createdAt");

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership" ADD CONSTRAINT "membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invite" ADD CONSTRAINT "invite_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invite" ADD CONSTRAINT "invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add nullable organisationId, backfill, then enforce NOT NULL
ALTER TABLE "workflow" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "document" ADD COLUMN "organisationId" TEXT;

-- One personal organisation + admin membership per existing user; attach their rows
DO $$
DECLARE
  r RECORD;
  org_id TEXT;
  org_slug TEXT;
BEGIN
  FOR r IN SELECT id, name, email FROM "user" LOOP
    org_id := replace(gen_random_uuid()::text, '-', '');
    org_slug := lower(regexp_replace(split_part(r.email, '@', 1), '[^a-z0-9]+', '-', 'g'))
      || '-'
      || substr(org_id, 1, 8);

    INSERT INTO "organisation" ("id", "name", "slug", "createdAt", "updatedAt")
    VALUES (
      org_id,
      COALESCE(NULLIF(trim(r.name), ''), split_part(r.email, '@', 1)) || '''s organisation',
      org_slug,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    INSERT INTO "membership" ("id", "organisationId", "userId", "role", "createdAt", "updatedAt")
    VALUES (
      replace(gen_random_uuid()::text, '-', ''),
      org_id,
      r.id,
      'ADMIN',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    INSERT INTO "audit_log" ("id", "organisationId", "actorId", "action", "entityType", "entityId", "metadata", "createdAt")
    VALUES (
      replace(gen_random_uuid()::text, '-', ''),
      org_id,
      r.id,
      'ORGANISATION_CREATED',
      'organisation',
      org_id,
      jsonb_build_object('source', 'migration'),
      CURRENT_TIMESTAMP
    );

    UPDATE "workflow" SET "organisationId" = org_id WHERE "ownerId" = r.id;
    UPDATE "document" SET "organisationId" = org_id WHERE "ownerId" = r.id;
  END LOOP;
END $$;

ALTER TABLE "workflow" ALTER COLUMN "organisationId" SET NOT NULL;
ALTER TABLE "document" ALTER COLUMN "organisationId" SET NOT NULL;

CREATE INDEX "workflow_organisationId_idx" ON "workflow"("organisationId");
CREATE INDEX "document_organisationId_idx" ON "document"("organisationId");

ALTER TABLE "workflow" ADD CONSTRAINT "workflow_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document" ADD CONSTRAINT "document_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
