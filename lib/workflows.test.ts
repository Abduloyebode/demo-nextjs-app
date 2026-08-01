import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { listWorkflows } from "./workflows";

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.

describe("listWorkflows", () => {
  let userId: string;
  let otherUserId: string;

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

    await prisma.workflow.createMany({
      data: [
        {
          name: "Ship onboarding redesign",
          description: "Ship it",
          status: "IN_PROGRESS",
          ownerId: userId,
        },
        {
          name: "Close Q3 customer interviews",
          description: "Talk to customers",
          status: "NOT_STARTED",
          ownerId: userId,
        },
        {
          name: "Fix flaky checkout test",
          description: null,
          status: "DONE",
          ownerId: userId,
        },
        {
          name: "Someone else's workflow",
          description: null,
          status: "DONE",
          ownerId: otherUserId,
        },
      ],
    });
  });

  afterAll(async () => {
    // Cascade delete removes each user's workflows too.
    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.$disconnect();
  });

  it("only returns workflows owned by the given user", async () => {
    const results = await listWorkflows(userId, {});
    expect(results).toHaveLength(3);
    expect(results.every((w) => w.ownerId === userId)).toBe(true);
  });

  it("filters by search term across name and description", async () => {
    const results = await listWorkflows(userId, { search: "onboarding" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Ship onboarding redesign");
  });

  it("is case-insensitive when searching", async () => {
    const results = await listWorkflows(userId, { search: "ONBOARDING" });
    expect(results).toHaveLength(1);
  });

  it("filters by status", async () => {
    const results = await listWorkflows(userId, { status: "DONE" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Fix flaky checkout test");
  });

  it("sorts by name ascending", async () => {
    const results = await listWorkflows(userId, { sort: "name" });
    expect(results.map((w) => w.name)).toEqual([
      "Close Q3 customer interviews",
      "Fix flaky checkout test",
      "Ship onboarding redesign",
    ]);
  });

  it("returns an empty array when nothing matches", async () => {
    const results = await listWorkflows(userId, { search: "nonexistent-workflow-name" });
    expect(results).toHaveLength(0);
  });
});
