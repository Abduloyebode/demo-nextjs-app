import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { listWorkflows } from "./workflows";

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.

describe("listWorkflows", () => {
  let userId: string;
  let otherUserId: string;
  let assigneeUserId: string;
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

    const assigneeUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Teammate",
        email: `teammate-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    assigneeUserId = assigneeUser.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Workflow Test Org",
        slug: `workflow-test-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId, role: "ADMIN" } },
      },
    });
    organisationId = organisation.id;

    await prisma.membership.create({
      data: { organisationId, userId: assigneeUserId, role: "MEMBER" },
    });

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
        {
          name: "Trashed workflow",
          description: null,
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
          deletedAt: new Date(),
        },
        {
          name: "Assigned to teammate",
          description: null,
          status: "NOT_STARTED",
          ownerId: userId,
          assigneeId: assigneeUserId,
          organisationId,
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
    if (assigneeUserId) await prisma.user.delete({ where: { id: assigneeUserId } });
    await prisma.$disconnect();
  });

  it("only returns active (non-deleted) workflows for the given organisation", async () => {
    const results = await listWorkflows(organisationId, {});
    expect(results).toHaveLength(4);
    expect(results.every((w) => w.organisationId === organisationId)).toBe(true);
    expect(results.some((w) => w.name === "Trashed workflow")).toBe(false);
  });

  it("returns only soft-deleted workflows when deleted: true", async () => {
    const results = await listWorkflows(organisationId, { deleted: true });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Trashed workflow");
    expect(results[0].deletedAt).not.toBeNull();
  });

  it("filters by assigneeId", async () => {
    const results = await listWorkflows(organisationId, { assigneeId: assigneeUserId });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Assigned to teammate");
  });

  it("includes the assignee's id/name/email when set, and null when unset", async () => {
    const results = await listWorkflows(organisationId, { search: "Assigned to teammate" });
    expect(results[0].assignee).toEqual(
      expect.objectContaining({ id: assigneeUserId, email: expect.any(String) }),
    );

    const unassigned = await listWorkflows(organisationId, { search: "onboarding" });
    expect(unassigned[0].assignee).toBeNull();
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
      "Assigned to teammate",
      "Close Q3 customer interviews",
      "Fix flaky checkout test",
      "Ship onboarding redesign",
    ]);
  });
});
