import type { Document } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** List shape omits PDF bytes so the documents page stays light. */
export type DocumentListItem = Omit<Document, "fileData">;

export type ListDocumentsParams = {
  /** false/undefined = active documents only (default). true = trash view (soft-deleted only). */
  deleted?: boolean;
};

export function listDocuments(
  organisationId: string,
  params: ListDocumentsParams = {},
): Promise<DocumentListItem[]> {
  const { deleted = false } = params;

  return prisma.document.findMany({
    where: { organisationId, deletedAt: deleted ? { not: null } : null },
    orderBy: { createdAt: "desc" },
    omit: { fileData: true },
  });
}
