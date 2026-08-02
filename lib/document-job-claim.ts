// Split out from lib/document-job.ts because this file imports the Prisma
// client (and transitively `pg`, a Node-only module) — importing it from a
// client component breaks the browser bundle. Client components should
// import the pure status/label helpers from lib/document-job.ts instead.
import { prisma } from "@/lib/prisma";
import { isTerminalDocumentStatus } from "@/lib/document-job";

export type ClaimResult =
  | { claimed: true }
  | { claimed: false; reason: "not_found" | "no_file_data" | string };

/**
 * Atomically moves a PENDING document to PROCESSING so that concurrent or
 * duplicate job runs for the same document id can't both proceed to the
 * (expensive, non-idempotent) extraction step. Returns claimed: false if
 * another run already claimed it, if the document is already finished, or
 * if it can't be found/has no file to process.
 */
export async function claimDocumentForProcessing(
  documentId: string,
): Promise<ClaimResult> {
  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    select: { status: true, fileData: true },
  });

  if (!existing) {
    return { claimed: false, reason: "not_found" };
  }

  if (isTerminalDocumentStatus(existing.status)) {
    return { claimed: false, reason: existing.status };
  }

  if (!existing.fileData) {
    return { claimed: false, reason: "no_file_data" };
  }

  // Only PENDING is a valid source state for the claim itself — PROCESSING
  // must NOT be included here, or a document already claimed by one run
  // could be "claimed" again by a concurrent run (the update would still
  // match and report success). Inngest's step memoization means a
  // successfully-claimed step is never re-run for retries of the *same*
  // execution, so there's no need to allow re-claiming from PROCESSING.
  const updated = await prisma.document.updateMany({
    where: { id: documentId, status: "PENDING" },
    data: { status: "PROCESSING", errorMessage: null },
  });

  if (updated.count === 0) {
    const again = await prisma.document.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    return { claimed: false, reason: again?.status ?? "not_found" };
  }

  return { claimed: true };
}
