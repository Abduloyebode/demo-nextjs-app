import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  getAttentionSummary,
  hasAnyAttentionItems,
  type AttentionSummary,
} from "./attention";

const emptyBucket = { count: 0, items: [] };

function emptySummary(): AttentionSummary {
  return {
    overdueWorkflows: { ...emptyBucket },
    dueTodayWorkflows: { ...emptyBucket },
    failedDocuments: { ...emptyBucket },
    highRiskDocuments: { ...emptyBucket },
  };
}

describe("hasAnyAttentionItems", () => {
  it("is false when every bucket is empty", () => {
    expect(hasAnyAttentionItems(emptySummary())).toBe(false);
  });

  it("is true when exactly one bucket has items", () => {
    const summary = emptySummary();
    summary.overdueWorkflows.count = 1;
    expect(hasAnyAttentionItems(summary)).toBe(true);
  });

  it("is true when every bucket has items", () => {
    const summary = emptySummary();
    summary.overdueWorkflows.count = 2;
    summary.dueTodayWorkflows.count = 1;
    summary.failedDocuments.count = 3;
    summary.highRiskDocuments.count = 1;
    expect(hasAnyAttentionItems(summary)).toBe(true);
  });
});

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.
describe("getAttentionSummary", () => {
  let userId: string;
  let organisationId: string;

  const DAY_MS = 24 * 60 * 60 * 1000;

  function utcStartOfToday(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Attention Test User",
        email: `attention-test-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    userId = user.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Attention Test Org",
        slug: `attention-test-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId, role: "ADMIN" } },
      },
    });
    organisationId = organisation.id;

    const startOfToday = utcStartOfToday();

    await prisma.workflow.createMany({
      data: [
        {
          name: "Overdue, in progress",
          status: "IN_PROGRESS",
          ownerId: userId,
          organisationId,
          dueDate: new Date(startOfToday.getTime() - DAY_MS),
        },
        {
          name: "Overdue but done (excluded)",
          status: "DONE",
          ownerId: userId,
          organisationId,
          dueDate: new Date(startOfToday.getTime() - DAY_MS),
        },
        {
          name: "Overdue but deleted (excluded)",
          status: "IN_PROGRESS",
          ownerId: userId,
          organisationId,
          dueDate: new Date(startOfToday.getTime() - DAY_MS),
          deletedAt: new Date(),
        },
        {
          name: "Due at start of today",
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
          dueDate: startOfToday,
        },
        {
          name: "Due just before end of today",
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
          dueDate: new Date(startOfToday.getTime() + DAY_MS - 1),
        },
        {
          name: "Due tomorrow (excluded)",
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
          dueDate: new Date(startOfToday.getTime() + DAY_MS),
        },
        {
          name: "No due date (excluded)",
          status: "IN_PROGRESS",
          ownerId: userId,
          organisationId,
        },
      ],
    });

    await prisma.document.createMany({
      data: [
        {
          fileName: "failed.pdf",
          fileSize: 100,
          status: "FAILED",
          errorMessage: "boom",
          ownerId: userId,
          organisationId,
        },
        {
          fileName: "failed-deleted.pdf",
          fileSize: 100,
          status: "FAILED",
          errorMessage: "boom",
          ownerId: userId,
          organisationId,
          deletedAt: new Date(),
        },
        {
          fileName: "high-risk-completed.pdf",
          fileSize: 100,
          status: "COMPLETED",
          riskLevel: "HIGH",
          ownerId: userId,
          organisationId,
        },
        {
          fileName: "high-risk-still-processing.pdf",
          fileSize: 100,
          status: "PROCESSING",
          ownerId: userId,
          organisationId,
        },
        {
          fileName: "low-risk-completed.pdf",
          fileSize: 100,
          status: "COMPLETED",
          riskLevel: "LOW",
          ownerId: userId,
          organisationId,
        },
      ],
    });
  });

  afterAll(async () => {
    if (organisationId) {
      await prisma.organisation.delete({ where: { id: organisationId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("buckets overdue workflows correctly, excluding DONE and deleted", async () => {
    const summary = await getAttentionSummary(organisationId);
    expect(summary.overdueWorkflows.count).toBe(1);
    expect(summary.overdueWorkflows.items[0].name).toBe("Overdue, in progress");
  });

  it("buckets due-today workflows at both boundaries, excluding tomorrow", async () => {
    const summary = await getAttentionSummary(organisationId);
    expect(summary.dueTodayWorkflows.count).toBe(2);
    const names = summary.dueTodayWorkflows.items.map((item) => item.name).sort();
    expect(names).toEqual(["Due at start of today", "Due just before end of today"]);
  });

  it("buckets failed documents, excluding deleted", async () => {
    const summary = await getAttentionSummary(organisationId);
    expect(summary.failedDocuments.count).toBe(1);
    expect(summary.failedDocuments.items[0].fileName).toBe("failed.pdf");
  });

  it("buckets high-risk documents only when COMPLETED", async () => {
    const summary = await getAttentionSummary(organisationId);
    expect(summary.highRiskDocuments.count).toBe(1);
    expect(summary.highRiskDocuments.items[0].fileName).toBe("high-risk-completed.pdf");
  });

  it("reports nothing for an org with no qualifying rows", async () => {
    const otherOrg = await prisma.organisation.create({
      data: { name: "Empty Org", slug: `empty-org-${randomUUID().slice(0, 8)}` },
    });
    try {
      const summary = await getAttentionSummary(otherOrg.id);
      expect(hasAnyAttentionItems(summary)).toBe(false);
    } finally {
      await prisma.organisation.delete({ where: { id: otherOrg.id } });
    }
  });
});
