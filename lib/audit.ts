import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ORGANISATION_CREATED"
  | "MEMBER_INVITED"
  | "INVITE_REVOKED"
  | "INVITE_ACCEPTED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED";

export async function writeAuditLog(input: {
  organisationId: string;
  actorId?: string | null;
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
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
