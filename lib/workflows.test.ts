import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { listWorkflows } from "./workflows";

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.

describe("listWorkflows", () => {
  let userId: string;
  let otherUserId: string;
  let organisationId: string;
  let otherOrganisationId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Workflow Test User",
        email: `workflow-test-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    userId = user.id;

    const otherUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Other User",
        email: `other-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    otherUserId = otherUser.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Workflow Test Org",
        slug: `workflow-test-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId, role: "ADMIN" } },
      },
    });
    organisationId = organisation.id;

    const otherOrganisation = await prisma.organisation.create({
      data: {
        name: "Other Org",
        slug: `other-org-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: otherUserId, role: "ADMIN" } },
      },
    });
    otherOrganisationId = otherOrganisation.id;

    await prisma.workflow.createMany({
      data: [
        {
          name: "Ship onboarding redesign",
          description: "Ship it",
          status: "IN_PROGRESS",
          ownerId: userId,
          organisationId,
        },
        {
          name: "Close Q3 customer interviews",
          description: "Talk to customers",
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
        },
        {
          name: "Fix flaky checkout test",
          description: null,
          status: "DONE",
          ownerId: userId,
          organisationId,
        },
        {
          name: "Someone else's workflow",
          description: null,
          status: "DONE",
          ownerId: otherUserId,
          organisationId: otherOrganisationId,
        },
      ],
    });
  });

  afterAll(async () => {
    if (organisationId) {
      await prisma.organisation.delete({ where: { id: organisationId } });
    }
    if (otherOrganisationId) {
      await prisma.organisation.delete({ where: { id: otherOrganisationId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (otherUserId) await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.$disconnect();
  });

  it("only returns workflows for the given organisation", async () => {
    const results = await listWorkflows(organisationId, {});
    expect(results).toHaveLength(3);
    expect(results.every((w) => w.organisationId === organisationId)).toBe(true);
  });

  it("filters by search term across name and description", async () => {
    const results = await listWorkflows(organisationId, { search: "onboarding" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Ship onboarding redesign");
  });

  it("is case-insensitive when searching", async () => {
    const results = await listWorkflows(organisationId, { search: "ONBOARDING" });
    expect(results).toHaveLength(1);
  });

  it("filters by status", async () => {
    const results = await listWorkflows(organisationId, { status: "DONE" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Fix flaky checkout test");
  });

  it("sorts by name ascending", async () => {
    const results = await listWorkflows(organisationId, { sort: "name" });
    expect(results.map((w) => w.name)).toEqual([
      "Close Q3 customer interviews",
      "Fix flaky checkout test",
      "Ship onboarding redesign",
    ]);
  });
});
