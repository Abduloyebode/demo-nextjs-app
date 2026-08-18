import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { isOrganisationMember } from "./organisation-admin";

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.

describe("isOrganisationMember", () => {
  let memberUserId: string;
  let otherOrgUserId: string;
  let organisationId: string;
  let otherOrganisationId: string;

  beforeAll(async () => {
    const member = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Member",
        email: `member-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    memberUserId = member.id;

    const otherOrgUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Other Org User",
        email: `other-org-user-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    otherOrgUserId = otherOrgUser.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Membership Test Org",
        slug: `membership-test-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: memberUserId, role: "MEMBER" } },
      },
    });
    organisationId = organisation.id;

    const otherOrganisation = await prisma.organisation.create({
      data: {
        name: "Other Org",
        slug: `other-org-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: otherOrgUserId, role: "ADMIN" } },
      },
    });
    otherOrganisationId = otherOrganisation.id;
  });

  afterAll(async () => {
    if (organisationId) await prisma.organisation.delete({ where: { id: organisationId } });
    if (otherOrganisationId)
      await prisma.organisation.delete({ where: { id: otherOrganisationId } });
    if (memberUserId) await prisma.user.delete({ where: { id: memberUserId } });
    if (otherOrgUserId) await prisma.user.delete({ where: { id: otherOrgUserId } });
    await prisma.$disconnect();
  });

  it("is true for a real member of the organisation", async () => {
    expect(await isOrganisationMember(organisationId, memberUserId)).toBe(true);
  });

  it("is false for a user who belongs to a different organisation", async () => {
    expect(await isOrganisationMember(organisationId, otherOrgUserId)).toBe(false);
  });

  it("is false for a nonexistent user id", async () => {
    expect(await isOrganisationMember(organisationId, randomUUID())).toBe(false);
  });
});
