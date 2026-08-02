import type { Document } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** List shape omits PDF bytes so the documents page stays light. */
export type DocumentListItem = Omit<Document, "fileData">;

export function listDocuments(
  organisationId: string,
): Promise<DocumentListItem[]> {
  return prisma.document.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    omit: { fileData: true },
  });
}
