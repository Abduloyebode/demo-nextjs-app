import { prisma } from "@/lib/prisma";
import { isOrganisationMember } from "@/lib/organisation-admin";
import { writeAuditLog } from "@/lib/audit";
import type { WorkflowInput } from "@/lib/workflow-validation";

export type WorkflowActionResult = { error: string | null };

export type WorkflowContext = { userId: string; organisationId: string };

/**
 * Validates the assignee (if any) is a current member of this organisation,
 * and parses the yyyy-mm-dd due-date string as UTC midnight (matching how
 * `lib/attention.ts` computes "today" boundaries, so overdue/due-today
 * comparisons line up).
 */
async function resolveWorkflowWriteFields(
  organisationId: string,
  input: WorkflowInput,
): Promise<
  | { error: string }
  | { error: null; dueDate: Date | null; assigneeId: string | null }
> {
  const assigneeId = input.assigneeId || null;
  if (assigneeId && !(await isOrganisationMember(organisationId, assigneeId))) {
    return { error: "Choose a valid assignee." };
  }

  const dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;

  return { error: null, dueDate, assigneeId };
}

export async function createWorkflowForOrg(
  ctx: WorkflowContext,
  input: WorkflowInput,
): Promise<WorkflowActionResult> {
  const fields = await resolveWorkflowWriteFields(ctx.organisationId, input);
  if (fields.error !== null) {
    return { error: fields.error };
  }

  await prisma.workflow.create({
    data: {
      name: input.name,
      description: input.description || null,
      status: input.status,
      dueDate: fields.dueDate,
      assigneeId: fields.assigneeId,
      ownerId: ctx.userId,
      organisationId: ctx.organisationId,
    },
  });

  return { error: null };
}

export async function updateWorkflowForOrg(
  ctx: WorkflowContext,
  id: string,
  input: WorkflowInput,
): Promise<WorkflowActionResult> {
  const fields = await resolveWorkflowWriteFields(ctx.organisationId, input);
  if (fields.error !== null) {
    return { error: fields.error };
  }

  const existing = await prisma.workflow.findFirst({
    where: { id, organisationId: ctx.organisationId, deletedAt: null },
    select: { status: true },
  });

  if (!existing) {
    return { error: "That workflow could not be found." };
  }

  const statusChanged = existing.status !== input.status;

  const result = await prisma.workflow.updateMany({
    where: { id, organisationId: ctx.organisationId, deletedAt: null },
    data: {
      name: input.name,
      description: input.description || null,
      status: input.status,
      dueDate: fields.dueDate,
      assigneeId: fields.assigneeId,
      ...(statusChanged ? { previousStatus: existing.status } : {}),
    },
  });

  if (result.count === 0) {
    return { error: "That workflow could not be found." };
  }

  if (statusChanged) {
    await writeAuditLog({
      organisationId: ctx.organisationId,
      actorId: ctx.userId,
      action: "WORKFLOW_STATUS_CHANGED",
      entityType: "workflow",
      entityId: id,
      metadata: { from: existing.status, to: input.status },
    });
  }

  return { error: null };
}

export async function deleteWorkflowForOrg(
  ctx: WorkflowContext,
  id: string,
): Promise<WorkflowActionResult> {
  const result = await prisma.workflow.updateMany({
    where: { id, organisationId: ctx.organisationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
    return { error: "That workflow could not be found." };
  }

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "WORKFLOW_DELETED",
    entityType: "workflow",
    entityId: id,
  });

  return { error: null };
}

export async function restoreWorkflowForOrg(
  ctx: WorkflowContext,
  id: string,
): Promise<WorkflowActionResult> {
  const result = await prisma.workflow.updateMany({
    where: { id, organisationId: ctx.organisationId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });

  if (result.count === 0) {
    return { error: "That workflow could not be found." };
  }

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "WORKFLOW_RESTORED",
    entityType: "workflow",
    entityId: id,
  });

  return { error: null };
}

export async function revertWorkflowStatusForOrg(
  ctx: WorkflowContext,
  id: string,
): Promise<WorkflowActionResult> {
  const existing = await prisma.workflow.findFirst({
    where: { id, organisationId: ctx.organisationId, deletedAt: null },
    select: { status: true, previousStatus: true },
  });

  if (!existing) {
    return { error: "That workflow could not be found." };
  }

  if (!existing.previousStatus) {
    return { error: "There's no previous status to restore." };
  }

  // Compare-and-swap on `previousStatus`: guards against two concurrent
  // reverts (or a revert racing another status change) both applying —
  // only the call that still sees the expected previousStatus succeeds.
  const result = await prisma.workflow.updateMany({
    where: {
      id,
      organisationId: ctx.organisationId,
      deletedAt: null,
      previousStatus: existing.previousStatus,
    },
    data: { status: existing.previousStatus, previousStatus: null },
  });

  if (result.count === 0) {
    return { error: "There's no previous status to restore." };
  }

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "WORKFLOW_STATUS_REVERTED",
    entityType: "workflow",
    entityId: id,
    metadata: { from: existing.status, to: existing.previousStatus },
  });

  return { error: null };
}
