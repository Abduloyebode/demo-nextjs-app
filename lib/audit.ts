import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ORGANISATION_CREATED"
  | "MEMBER_INVITED"
  | "INVITE_REVOKED"
  | "INVITE_ACCEPTED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED"
  | "WORKFLOW_DELETED"
  | "WORKFLOW_RESTORED"
  | "WORKFLOW_STATUS_CHANGED"
  | "WORKFLOW_STATUS_REVERTED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_RESTORED";

export async function writeAuditLog(input: {
  organisationId: string;
  actorId?: string | null;
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  // Best-effort: the audit trail is a record of an action that already
  // happened, so a transient failure here must not surface as an error on
  // an operation that actually succeeded. Log and swallow instead of
  // throwing.
  try {
    return await prisma.auditLog.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to write audit log entry", {
      action: input.action,
      organisationId: input.organisationId,
    }, error);
    return null;
  }
}

export function listAuditLogs(organisationId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
}
