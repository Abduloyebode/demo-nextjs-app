import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export type DocumentActionResult = { error: string | null };

export type DocumentContext = { userId: string; organisationId: string };

export async function deleteDocumentForOrg(
  ctx: DocumentContext,
  id: string,
): Promise<DocumentActionResult> {
  // Soft-delete: `fileData` is deliberately left intact (not nulled) so a
  // restore is genuinely lossless, including for a document that hadn't
  // finished processing yet. Storage isn't reclaimed until an eventual
  // purge, which is out of scope for now — same trade-off already accepted
  // for workflow trash (no auto-purge there either).
  const result = await prisma.document.updateMany({
    where: { id, organisationId: ctx.organisationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
    return { error: "That document could not be found." };
  }

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "DOCUMENT_DELETED",
    entityType: "document",
    entityId: id,
  });

  return { error: null };
}

export async function restoreDocumentForOrg(
  ctx: DocumentContext,
  id: string,
): Promise<DocumentActionResult> {
  const result = await prisma.document.updateMany({
    where: { id, organisationId: ctx.organisationId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });

  if (result.count === 0) {
    return { error: "That document could not be found." };
  }

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "DOCUMENT_RESTORED",
    entityType: "document",
    entityId: id,
  });

  return { error: null };
}
