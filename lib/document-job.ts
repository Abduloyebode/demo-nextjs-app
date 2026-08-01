import type { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UnsupportedPdfError } from "@/lib/pdf";
import { AiExtractionError } from "@/lib/ai-extraction";

export function isTerminalDocumentStatus(status: DocumentStatus): boolean {
  return status === "COMPLETED" || status === "FAILED";
}

export function isInFlightDocumentStatus(status: DocumentStatus): boolean {
  return status === "PENDING" || status === "PROCESSING";
}

export type ClassifiedProcessingError = {
  permanent: boolean;
  message: string;
};

/**
 * Permanent errors should not be retried (bad PDF, missing file, etc.).
 * Temporary errors (most AI/network failures) should throw so Inngest retries.
 */
export function classifyProcessingError(
  error: unknown,
): ClassifiedProcessingError {
  if (error instanceof UnsupportedPdfError) {
    return { permanent: true, message: error.message };
  }

  if (error instanceof AiExtractionError) {
    const message = error.message;
    const looksConfigOrValidation =
      message.includes("OPENAI_API_KEY") ||
      message.includes("did not return a usable result") ||
      message.includes("did not match the expected shape");

    return {
      permanent: looksConfigOrValidation,
      message,
    };
  }

  if (error instanceof Error) {
    return {
      permanent: false,
      message: error.message || "Something went wrong while processing this document.",
    };
  }

  return {
    permanent: false,
    message: "Something went wrong while processing this document.",
  };
}

export type ClaimResult =
  | { claimed: true }
  | { claimed: false; reason: "not_found" | "no_file_data" | DocumentStatus };

/**
 * Atomically moves a PENDING/PROCESSING document to PROCESSING so that
 * concurrent or duplicate job runs for the same document id can't both
 * proceed to the (expensive, non-idempotent) extraction step. Returns
 * claimed: false if another run already claimed it, if the document is
 * already finished, or if it can't be found/has no file to process.
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

export function documentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
  }
}
