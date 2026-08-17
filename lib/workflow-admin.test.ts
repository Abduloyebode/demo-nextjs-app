import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  createWorkflowForOrg,
  deleteWorkflowForOrg,
  restoreWorkflowForOrg,
  revertWorkflowStatusForOrg,
  updateWorkflowForOrg,
  type WorkflowContext,
} from "./workflow-admin";
import type { WorkflowInput } from "./workflow-validation";

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.

function baseInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
  return {
    name: "Test workflow",
    description: "",
    status: "NOT_STARTED",
    dueDate: "",
    assigneeId: "",
    ...overrides,
  };
}

describe("workflow-admin", () => {
  let userId: string;
  let memberId: string;
  let otherOrgUserId: string;
  let organisationId: string;
  let otherOrganisationId: string;
  let ctx: WorkflowContext;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Admin Test User",
        email: `wf-admin-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    userId = user.id;

    const member = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Teammate",
        email: `wf-admin-teammate-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    memberId = member.id;

    const otherOrgUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Other Org User",
        email: `wf-admin-other-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    otherOrgUserId = otherOrgUser.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Workflow Admin Test Org",
        slug: `wf-admin-${randomUUID().slice(0, 8)}`,
        memberships: {
          create: [
            { userId, role: "ADMIN" },
            { userId: memberId, role: "MEMBER" },
          ],
        },
      },
    });
    organisationId = organisation.id;

    const otherOrganisation = await prisma.organisation.create({
      data: {
        name: "Other Org",
        slug: `wf-admin-other-org-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: otherOrgUserId, role: "ADMIN" } },
      },
    });
    otherOrganisationId = otherOrganisation.id;

    ctx = { userId, organisationId };
  });

  afterAll(async () => {
    if (organisationId) await prisma.organisation.delete({ where: { id: organisationId } });
    if (otherOrganisationId)
      await prisma.organisation.delete({ where: { id: otherOrganisationId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (memberId) await prisma.user.delete({ where: { id: memberId } });
    if (otherOrgUserId) await prisma.user.delete({ where: { id: otherOrgUserId } });
    await prisma.$disconnect();
  });

  it("rejects an assignee who isn't a current member of the organisation, on create", async () => {
    const result = await createWorkflowForOrg(
      ctx,
      baseInput({ assigneeId: otherOrgUserId }),
    );
    expect(result.error).toMatch(/valid assignee/i);
    const count = await prisma.workflow.count({ where: { organisationId, name: "Test workflow" } });
    expect(count).toBe(0);
  });

  it("accepts a valid assignee on create and stores it", async () => {
    const result = await createWorkflowForOrg(
      ctx,
      baseInput({ name: "Assigned on create", assigneeId: memberId }),
    );
    expect(result.error).toBeNull();
    const workflow = await prisma.workflow.findFirstOrThrow({
      where: { organisationId, name: "Assigned on create" },
    });
    expect(workflow.assigneeId).toBe(memberId);
  });

  it("rejects an invalid assignee on update, leaving the row unchanged", async () => {
    const created = await prisma.workflow.create({
      data: { name: "Update target", status: "NOT_STARTED", ownerId: userId, organisationId },
    });

    const result = await updateWorkflowForOrg(
      ctx,
      created.id,
      baseInput({ name: "Renamed", assigneeId: otherOrgUserId }),
    );
    expect(result.error).toMatch(/valid assignee/i);

    const stillThere = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
    expect(stillThere.name).toBe("Update target");
    expect(stillThere.assigneeId).toBeNull();
  });

  describe("status change bookkeeping", () => {
    it("sets previousStatus when status changes, and writes an audit entry", async () => {
      const created = await prisma.workflow.create({
        data: { name: "Status flow", status: "NOT_STARTED", ownerId: userId, organisationId },
      });

      const result = await updateWorkflowForOrg(
        ctx,
        created.id,
        baseInput({ name: "Status flow", status: "IN_PROGRESS" }),
      );
      expect(result.error).toBeNull();

      const updated = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(updated.status).toBe("IN_PROGRESS");
      expect(updated.previousStatus).toBe("NOT_STARTED");

      const auditEntry = await prisma.auditLog.findFirst({
        where: { organisationId, entityId: created.id, action: "WORKFLOW_STATUS_CHANGED" },
      });
      expect(auditEntry?.metadata).toMatchObject({ from: "NOT_STARTED", to: "IN_PROGRESS" });
    });

    it("does not touch previousStatus when status is unchanged", async () => {
      const created = await prisma.workflow.create({
        data: {
          name: "No status change",
          status: "IN_PROGRESS",
          previousStatus: "NOT_STARTED",
          ownerId: userId,
          organisationId,
        },
      });

      await updateWorkflowForOrg(
        ctx,
        created.id,
        baseInput({ name: "No status change renamed", status: "IN_PROGRESS" }),
      );

      const updated = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(updated.previousStatus).toBe("NOT_STARTED");
    });

    it("only ever tracks one level back — a second status change overwrites previousStatus", async () => {
      const created = await prisma.workflow.create({
        data: { name: "Multi change", status: "NOT_STARTED", ownerId: userId, organisationId },
      });

      await updateWorkflowForOrg(
        ctx,
        created.id,
        baseInput({ name: "Multi change", status: "IN_PROGRESS" }),
      );
      await updateWorkflowForOrg(
        ctx,
        created.id,
        baseInput({ name: "Multi change", status: "DONE" }),
      );

      const updated = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(updated.status).toBe("DONE");
      expect(updated.previousStatus).toBe("IN_PROGRESS");
    });
  });

  describe("revertWorkflowStatusForOrg", () => {
    it("reverts to the previous status and clears previousStatus", async () => {
      const created = await prisma.workflow.create({
        data: {
          name: "Revert me",
          status: "IN_PROGRESS",
          previousStatus: "NOT_STARTED",
          ownerId: userId,
          organisationId,
        },
      });

      const result = await revertWorkflowStatusForOrg(ctx, created.id);
      expect(result.error).toBeNull();

      const reverted = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(reverted.status).toBe("NOT_STARTED");
      expect(reverted.previousStatus).toBeNull();

      const auditEntry = await prisma.auditLog.findFirst({
        where: { organisationId, entityId: created.id, action: "WORKFLOW_STATUS_REVERTED" },
      });
      expect(auditEntry?.metadata).toMatchObject({ from: "IN_PROGRESS", to: "NOT_STARTED" });
    });

    it("is single-level only — a second revert has nothing left to restore", async () => {
      const created = await prisma.workflow.create({
        data: {
          name: "Single level",
          status: "IN_PROGRESS",
          previousStatus: "NOT_STARTED",
          ownerId: userId,
          organisationId,
        },
      });

      await revertWorkflowStatusForOrg(ctx, created.id);
      const second = await revertWorkflowStatusForOrg(ctx, created.id);
      expect(second.error).toMatch(/no previous status/i);
    });

    it("returns a not-found-style error when there's nothing to revert", async () => {
      const created = await prisma.workflow.create({
        data: { name: "Never changed", status: "NOT_STARTED", ownerId: userId, organisationId },
      });
      const result = await revertWorkflowStatusForOrg(ctx, created.id);
      expect(result.error).toMatch(/no previous status/i);
    });

    it("compare-and-swap: exactly one of two concurrent reverts succeeds", async () => {
      const created = await prisma.workflow.create({
        data: {
          name: "Racing revert",
          status: "IN_PROGRESS",
          previousStatus: "NOT_STARTED",
          ownerId: userId,
          organisationId,
        },
      });

      const [r1, r2] = await Promise.all([
        revertWorkflowStatusForOrg(ctx, created.id),
        revertWorkflowStatusForOrg(ctx, created.id),
      ]);

      const errors = [r1.error, r2.error].filter((e) => e !== null);
      expect(errors).toHaveLength(1);

      const final = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(final.status).toBe("NOT_STARTED");
      expect(final.previousStatus).toBeNull();
    });
  });

  describe("soft-delete and restore", () => {
    it("delete sets deletedAt but keeps the row queryable, and writes an audit entry", async () => {
      const created = await prisma.workflow.create({
        data: { name: "To delete", status: "NOT_STARTED", ownerId: userId, organisationId },
      });

      const result = await deleteWorkflowForOrg(ctx, created.id);
      expect(result.error).toBeNull();

      const deleted = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(deleted.deletedAt).not.toBeNull();

      const auditEntry = await prisma.auditLog.findFirst({
        where: { organisationId, entityId: created.id, action: "WORKFLOW_DELETED" },
      });
      expect(auditEntry).not.toBeNull();
    });

    it("a soft-deleted workflow can't be edited until restored", async () => {
      const created = await prisma.workflow.create({
        data: {
          name: "Deleted, try to edit",
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
          deletedAt: new Date(),
        },
      });

      const updateResult = await updateWorkflowForOrg(
        ctx,
        created.id,
        baseInput({ name: "Should not apply" }),
      );
      expect(updateResult.error).toMatch(/could not be found/i);

      const stillDeleted = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(stillDeleted.name).toBe("Deleted, try to edit");
    });

    it("restore round-trip: clears deletedAt, row is editable again, writes an audit entry", async () => {
      const created = await prisma.workflow.create({
        data: {
          name: "Restore me",
          status: "NOT_STARTED",
          ownerId: userId,
          organisationId,
          deletedAt: new Date(),
        },
      });

      const restoreResult = await restoreWorkflowForOrg(ctx, created.id);
      expect(restoreResult.error).toBeNull();

      const restored = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(restored.deletedAt).toBeNull();

      const auditEntry = await prisma.auditLog.findFirst({
        where: { organisationId, entityId: created.id, action: "WORKFLOW_RESTORED" },
      });
      expect(auditEntry).not.toBeNull();

      const editResult = await updateWorkflowForOrg(
        ctx,
        created.id,
        baseInput({ name: "Edited after restore" }),
      );
      expect(editResult.error).toBeNull();
      const edited = await prisma.workflow.findUniqueOrThrow({ where: { id: created.id } });
      expect(edited.name).toBe("Edited after restore");
    });
  });
});
